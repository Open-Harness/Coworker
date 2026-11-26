import { DurableObject } from "cloudflare:workers";
import { decodePerson, PERSON_HEADER } from "~/modules/protocol/service.ts";
import type { Person } from "~/modules/protocol/types.ts";
import { LIMITS, parseDirectoryCommand, PROTOCOL_VERSION } from "~/modules/protocol/service.ts";
import type { AdminCommand, CommandOutcome, DirectoryCommand } from "~/modules/protocol/types.ts";
import type { Projection } from "~/modules/chat-host/types.ts";
import { AgentStore } from "./internal/agent-store.ts";
import { assigned, notAdmin, notDeployed, runAdmin } from "./internal/agent-commands.ts";
import { openDatabase } from "./internal/database.ts";
import { type Changed, createWorkspace, deleteWorkspace, reconcile } from "./internal/lifecycle.ts";
import { Sockets } from "./internal/sockets.ts";
import { Store } from "./internal/store.ts";
import type { DirectoryDependencies } from "./types.ts";

export { createDirectoryPort, DIRECTORY_NAME } from "./internal/port.ts";

const RETRY_MS = 30_000;
const RESERVED_CLOSE = new Set([1005, 1006, 1015]);

const missing: CommandOutcome = { ok: false, error: { code: "not_found", message: "That workspace does not exist" } };

type Relayed = Extract<DirectoryCommand, { readonly type: `chat.${string}` }>;
const isAdminCommand = (command: DirectoryCommand): command is AdminCommand & { readonly requestId: string } =>
  command.type.startsWith("agent.");

/** The one list of workspaces, what each says about its chats and documents, and the agents they can use. */
export class DirectoryHost<Env = unknown> extends DurableObject<Env> {
  readonly #dependencies: DirectoryDependencies;
  readonly #sockets: Sockets;
  #store!: Store;
  #agents!: AgentStore;

  constructor(ctx: DurableObjectState, env: Env, dependencies: DirectoryDependencies) {
    super(ctx, env);
    this.#dependencies = dependencies;
    this.#sockets = new Sockets(ctx);
    void ctx.blockConcurrencyWhile(async () => {
      const database = await openDatabase(ctx.storage);
      this.#store = new Store(database);
      this.#agents = new AgentStore(database);
      if (this.#store.unfinished().length > 0) await this.#retryLater();
    });
  }

  override async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (request.method === "POST" && pathname === "/internal/publish") {
      // Written by a workspace of this deployment.
      const shown = this.#store.project((await request.json()) as Projection);
      if (shown !== undefined) this.#sockets.broadcast({ type: "workspace.changed", workspace: shown });
      return new Response(null, { status: 204 });
    }
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") return new Response(null, { status: 426 });
    const person = decodePerson(request.headers.get(PERSON_HEADER));
    if (person === undefined) return new Response(null, { status: 400 });
    const { 0: client, 1: server } = new WebSocketPair();
    this.#sockets.accept(server, person);
    this.#sockets.send(server, {
      type: "directory.snapshot",
      protocol: PROTOCOL_VERSION,
      me: person,
      models: this.#dependencies.models,
      workspaces: this.#store.listed(),
      people: this.#sockets.people(),
      agents: this.#agents.listed(),
      isAdmin: this.#dependencies.isAdmin(person),
    });
    this.#showPeople();
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const person = this.#sockets.person(socket);
    if (person === undefined) return this.#sockets.close(socket, 1011, "The connection has no person");
    if (typeof message !== "string") return this.#sockets.close(socket, 1003, "Only text is accepted");
    if (message.length > LIMITS.clientFrame) return this.#sockets.close(socket, 1009, "The message is too long");
    const parsed = parseDirectoryCommand(message);
    if (!parsed.ok) return this.#sockets.send(socket, { type: "error", message: parsed.message });
    const outcome = await this.#run(parsed.value, person);
    this.#sockets.send(socket, { type: "command.result", requestId: parsed.value.requestId, ...outcome });
  }

  async #run(command: DirectoryCommand, by: Person): Promise<CommandOutcome> {
    try {
      const { outcome, shown, removed, unfinished, events = [] } = await this.#change(command, by);
      if (shown !== undefined) this.#sockets.broadcast({ type: "workspace.changed", workspace: shown });
      if (removed !== undefined) this.#sockets.broadcast({ type: "workspace.removed", workspaceId: removed });
      for (const event of events) this.#sockets.broadcast(event);
      if (unfinished === true) await this.#retryLater();
      return outcome;
    } catch (error) {
      this.#dependencies.report("A directory command failed", error, { command: command.type });
      return { ok: false, error: { code: "failed", message: "The command failed" } };
    }
  }

  async #change(command: DirectoryCommand, by: Person): Promise<Changed> {
    const { workspaces, models, draft, isAdmin } = this.#dependencies;
    if (isAdminCommand(command)) {
      return isAdmin(by) ? runAdmin({ agents: this.#agents, models, draft }, command, by.name, Date.now()) : notAdmin;
    }
    switch (command.type) {
      case "workspace.create":
        return createWorkspace(this.#store, workspaces, { id: command.workspaceId, name: command.name, createdBy: by.name }, Date.now());
      case "workspace.update": {
        const row = this.#store.update(command.workspaceId, command.change, Date.now());
        if (row === undefined) return { outcome: missing };
        if (command.change.title !== undefined) await workspaces.rename({ workspaceId: row.id, name: row.name });
        return { outcome: { ok: true, output: { kind: "done" } }, shown: row };
      }
      case "workspace.delete":
        return deleteWorkspace(this.#store, workspaces, command.workspaceId);
      default:
        return this.#relay(command, by);
    }
  }

  async #relay(command: Relayed, by: Person): Promise<Changed> {
    const { workspaces } = this.#dependencies;
    const author = { id: by.id, name: by.name };
    if (this.#store.find(command.workspaceId)?.phase !== "active") return { outcome: missing };
    if (command.type !== "chat.create" || command.agentId === undefined) {
      return { outcome: await workspaces.relay(command, author) };
    }
    const agent = assigned(this.#agents, command.agentId, command.workspaceId);
    return agent === undefined ? notDeployed : { outcome: await workspaces.relay({ ...command, agent }, author) };
  }

  override async alarm(): Promise<void> {
    const { shown, left } = await reconcile(this.#store, this.#dependencies.workspaces);
    for (const workspace of shown) this.#sockets.broadcast({ type: "workspace.changed", workspace });
    if (left > 0) await this.#retryLater();
  }

  async #retryLater(): Promise<void> {
    if ((await this.ctx.storage.getAlarm()) === null) await this.ctx.storage.setAlarm(Date.now() + RETRY_MS);
  }

  #showPeople(): void {
    this.#sockets.broadcast({ type: "people.changed", people: this.#sockets.people() });
  }

  override async webSocketClose(socket: WebSocket, code: number, reason: string): Promise<void> {
    if (!RESERVED_CLOSE.has(code)) this.#sockets.close(socket, code, reason);
    this.#showPeople();
  }

  override async webSocketError(): Promise<void> {
    this.#showPeople();
  }
}

/** Who may open the admin view: the email addresses listed. With none listed, everyone may. */
export function createAdminCheck(emails: readonly string[]): (person: Person) => boolean {
  const ids = new Set(emails.map((email) => `email:${email.trim().toLowerCase()}`));
  return ({ id }) => ids.size === 0 || ids.has(id);
}
