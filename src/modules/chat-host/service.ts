import { DurableObject } from "cloudflare:workers";
import { decodePerson, PERSON_HEADER } from "~/modules/protocol/service.ts";
import { LIMITS, parseWorkspaceCommand } from "~/modules/protocol/service.ts";
import type { CommandOutcome, WorkspaceCommand, WorkspaceRequest } from "~/modules/protocol/types.ts";
import type { Author } from "~/modules/transcript/types.ts";
import { runRelayed } from "./internal/chat-commands.ts";
import { Connections } from "./internal/connections.ts";
import { openEngine } from "./internal/engine.ts";
import { refused } from "./internal/outcome.ts";
import { Room } from "./internal/room.ts";
import { runCommand, type Session, setTyping } from "./internal/router.ts";
import { KeyedSerialQueue } from "./internal/serial.ts";
import { Watches } from "./internal/watches.ts";
import type { Registration, RelayedCommand, WorkspaceDependencies } from "./types.ts";

export { createWorkspacePort, INTERNAL } from "./internal/port.ts";

const REGISTRATION = "registration";
/** Tells a page that the workspace does not exist, so it stops reconnecting. */
export const CLOSED_MISSING = 4404;
/** Close codes that only a runtime may report, never send. */
const RESERVED_CLOSE = new Set([1005, 1006, 1015]);

/**
 * One workspace: a Pi session with its chats, hosted in a Durable Object. An object nobody provisioned stays empty and
 * refuses connections, so guessing an id creates nothing.
 */
export class WorkspaceHost<Env = unknown> extends DurableObject<Env> {
  readonly #dependencies: WorkspaceDependencies;
  readonly #connections: Connections;
  readonly #watches: Watches;
  readonly #queue = new KeyedSerialQueue<WebSocket>();
  #session: Session | undefined;

  constructor(ctx: DurableObjectState, env: Env, dependencies: WorkspaceDependencies) {
    super(ctx, env);
    this.#dependencies = dependencies;
    this.#connections = new Connections(ctx);
    this.#watches = new Watches(this.#connections);
    void ctx.blockConcurrencyWhile(async () => {
      const registration = await ctx.storage.get<Registration>(REGISTRATION);
      if (registration !== undefined) await this.#open(registration);
    });
  }

  async #open(registration: Registration): Promise<void> {
    const { agent, report } = this.#dependencies;
    const engine = await openEngine(this.ctx, agent, report);
    try {
      const room = await Room.open(engine.harness, this.#connections, registration, this.#dependencies);
      this.#session = { engine, room, agent, connections: this.#connections, watches: this.#watches };
      await this.#restoreWatches(this.#session);
      await engine.resume();
      void room.publish();
    } catch (error) {
      this.#session = undefined;
      await engine.close();
      throw error;
    }
  }

  /** Sockets outlive the object while it hibernates; the views they had open do not. */
  async #restoreWatches({ engine, connections, watches }: Session): Promise<void> {
    for (const socket of connections.open()) {
      const chatId = connections.state(socket)?.chatId;
      if (chatId !== undefined) await watches.open(engine.harness, socket, chatId);
    }
  }

  override async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (request.method === "POST" && pathname.startsWith("/internal/")) {
      return this.#internal(pathname.slice("/internal/".length), await request.json());
    }
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") return new Response(null, { status: 426 });
    const person = decodePerson(request.headers.get(PERSON_HEADER));
    if (person === undefined) return new Response(null, { status: 400 });
    const { 0: client, 1: server } = new WebSocketPair();
    const session = this.#session;
    if (session === undefined) {
      server.accept();
      server.close(CLOSED_MISSING, "This workspace does not exist");
    } else {
      this.#connections.accept(server, person);
      await session.room.sendSnapshot(server);
      session.room.showPresence();
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  /** Requests from the directory. Bodies are written by this app's own objects. */
  async #internal(path: string, body: unknown): Promise<Response> {
    switch (path) {
      case "provision":
        return this.#provision(body as Registration);
      case "rename": {
        if (this.#session === undefined) return new Response(null, { status: 404 });
        await this.ctx.storage.put(REGISTRATION, body as Registration);
        this.#session.room.rename(body as Registration);
        return new Response(null, { status: 204 });
      }
      case "relay":
        return Response.json(await this.#relay(body as { command: RelayedCommand; by: Author }));
      case "destroy":
        await this.#destroy();
        return new Response(null, { status: 204 });
      default:
        return new Response(null, { status: 404 });
    }
  }

  async #provision(registration: Registration): Promise<Response> {
    await this.ctx.blockConcurrencyWhile(async () => {
      if (this.#session !== undefined) return;
      await this.ctx.storage.put(REGISTRATION, registration);
      await this.#open(registration);
    });
    return new Response(null, { status: 204 });
  }

  async #relay({ command, by }: { readonly command: RelayedCommand; readonly by: Author }): Promise<CommandOutcome> {
    const session = this.#session;
    if (session === undefined) return refused("not_found", "That workspace does not exist");
    const outcome = await runRelayed(session.engine, session.agent, command, by);
    if (outcome.ok && command.type === "chat.delete") await this.#closeChat(command.chatId);
    // The page navigates on the answer, so the directory should already know.
    await session.room.publish();
    return outcome;
  }

  async #closeChat(chatId: number): Promise<void> {
    for (const socket of this.#connections.open()) {
      const state = this.#connections.state(socket);
      if (state?.chatId !== chatId) continue;
      await this.#watches.stop(socket);
      this.#connections.setState(socket, { person: state.person });
      this.#connections.send(socket, { type: "chat.closed", chatId });
    }
  }

  async #destroy(): Promise<void> {
    const session = this.#session;
    this.#session = undefined;
    for (const socket of this.#connections.open()) {
      await this.#watches.stop(socket);
      this.#connections.close(socket, CLOSED_MISSING, "This workspace was deleted");
    }
    await session?.engine.close();
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
  }

  override async alarm(): Promise<void> {
    await this.#session?.engine.resume();
  }

  override async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    try {
      await this.#queue.run(socket, () => this.#receive(socket, message));
    } catch (error) {
      this.#dependencies.report("A message failed", error);
    }
  }

  async #receive(socket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const session = this.#session;
    if (session === undefined) return this.#connections.close(socket, CLOSED_MISSING, "This workspace was deleted");
    if (typeof message !== "string") return this.#connections.close(socket, 1003, "Only text is accepted");
    if (message.length > LIMITS.clientFrame) return this.#connections.close(socket, 1009, "The message is too long");
    const parsed = parseWorkspaceCommand(message);
    if (!parsed.ok) return this.#connections.send(socket, { type: "error", message: parsed.message });
    const command: WorkspaceCommand = parsed.value;
    if (command.type === "presence.typing") return setTyping(session, socket, command.chatId, command.typing);
    const outcome = await this.#run(session, socket, command);
    this.#connections.send(socket, { type: "command.result", requestId: command.requestId, ...outcome });
    if (command.type === "chat.fork") await session.room.publish();
  }

  async #run(session: Session, socket: WebSocket, command: WorkspaceRequest): Promise<CommandOutcome> {
    try {
      return await runCommand(session, socket, command);
    } catch (error) {
      this.#dependencies.report("A command failed", error, { command: command.type });
      return refused("failed", error instanceof Error ? error.message : "The command failed");
    }
  }

  override async webSocketClose(socket: WebSocket, code: number, reason: string): Promise<void> {
    if (!RESERVED_CLOSE.has(code)) this.#connections.close(socket, code, reason);
    await this.#leave(socket);
  }

  override async webSocketError(socket: WebSocket): Promise<void> {
    await this.#leave(socket);
  }

  async #leave(socket: WebSocket): Promise<void> {
    await this.#queue.run(socket, () => this.#watches.stop(socket));
    this.#session?.room.showPresence();
  }
}
