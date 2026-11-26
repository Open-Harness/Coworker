import { exports } from "cloudflare:workers";
import { signUp } from "./flows.ts";
import { FrameJoiner, newId, parseDirectoryEvent, parseWorkspaceEvent } from "~/modules/protocol/service.ts";
import type {
  CommandOutcome,
  DirectoryCommand,
  DirectoryEvent,
  Parsed,
  WorkspaceCommand,
  WorkspaceEvent,
  WorkspaceRequest,
} from "~/modules/protocol/types.ts";

const sessions = new Map<string, Promise<string>>();

/** The session cookie of `<name>@example.test`, signed up once per test file through the email link. */
export function sessionOf(name: string): Promise<string> {
  const known = sessions.get(name);
  if (known !== undefined) return known;
  const started = signUp(`${name.toLowerCase()}@example.test`, name).then((browser) => browser.cookie);
  sessions.set(name, started);
  return started;
}

/** The app's own Worker, as a visitor reaches it. */
export const worker = (
  exports as unknown as { default: { fetch(url: string, init?: RequestInit): Promise<Response & { webSocket?: WebSocket | null }> } }
).default;

type Unsent<T> = T extends unknown ? Omit<T, "requestId"> : never;

/** A page, as the server sees one: a socket, what it received, and commands matched with their results. */
export class TestClient<Command extends { readonly requestId: string }, Event extends { readonly type: string }> {
  readonly events: Event[] = [];
  closed: number | undefined;
  readonly #waiting = new Set<() => void>();

  private constructor(
    readonly socket: WebSocket,
    parse: (text: string) => Parsed<Event>,
  ) {
    const joiner = new FrameJoiner();
    socket.addEventListener("message", ({ data }) => {
      const joined = joiner.push(String(data));
      if (!joined.ok) throw new Error(joined.message);
      if (joined.value === undefined) return;
      const event = parse(joined.value);
      if (!event.ok) throw new Error(`${event.message}: ${joined.value.slice(0, 400)}`);
      this.events.push(event.value);
      this.#wake();
    });
    socket.addEventListener("close", ({ code }) => {
      this.closed = code;
      this.#wake();
    });
    (socket as unknown as { accept(): void }).accept();
  }

  static async connect<C extends { readonly requestId: string }, E extends { readonly type: string }>(
    path: string,
    name: string,
    parse: (text: string) => Parsed<E>,
    headers: Readonly<Record<string, string>> = {},
  ): Promise<TestClient<C, E>> {
    const response = await worker.fetch(`https://app.test${path}`, {
      headers: { Upgrade: "websocket", cookie: await sessionOf(name), ...headers },
    });
    const socket = response.webSocket;
    if (!socket) throw new Error(`No socket: ${response.status}`);
    return new TestClient<C, E>(socket as unknown as WebSocket, parse);
  }

  #wake(): void {
    for (const waiting of this.#waiting) waiting();
  }

  /** The first event, received already or later, for which `select` returns something. */
  async until<T>(what: string, select: (event: Event) => T | undefined, timeoutMs = 10_000): Promise<T> {
    return this.settle(
      what,
      () => {
        for (const event of this.events) {
          const selected = select(event);
          if (selected !== undefined) return selected;
        }
        return undefined;
      },
      timeoutMs,
    );
  }

  async settle<T>(what: string, read: () => T | undefined, timeoutMs = 10_000): Promise<T> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const value = read();
      if (value !== undefined) return value;
      if (Date.now() > deadline) throw new Error(`Timed out waiting for ${what}`);
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 100);
        const wake = () => {
          clearTimeout(timer);
          this.#waiting.delete(wake);
          resolve();
        };
        this.#waiting.add(wake);
      });
    }
  }

  async send(command: Unsent<Command>, requestId = newId()): Promise<CommandOutcome> {
    this.socket.send(JSON.stringify({ ...command, requestId }));
    return this.until(`the result of ${JSON.stringify(command).slice(0, 80)}`, (event) =>
      event.type === "command.result" && (event as unknown as { requestId: string }).requestId === requestId
        ? (event as unknown as CommandOutcome)
        : undefined,
    );
  }

  close(): void {
    this.socket.close(1000, "done");
  }
}

export type DirectoryClient = TestClient<DirectoryCommand, DirectoryEvent>;
export type WorkspaceClient = TestClient<WorkspaceRequest, WorkspaceEvent>;

export const joinDirectory = (name: string): Promise<DirectoryClient> =>
  TestClient.connect("/api/directory/socket", name, parseDirectoryEvent);
/** As the login listed in `PI_EXP_ADMINS`. */
export const joinAdmin = (): Promise<DirectoryClient> => TestClient.connect("/api/directory/socket", "Admin", parseDirectoryEvent);
export const joinWorkspace = (workspaceId: string, name: string): Promise<WorkspaceClient> =>
  TestClient.connect(`/api/workspaces/${workspaceId}/socket`, name, parseWorkspaceEvent);

export const say = (client: WorkspaceClient, command: Extract<WorkspaceCommand, { type: "presence.typing" }>): void =>
  client.socket.send(JSON.stringify(command));

export function expectOk(outcome: CommandOutcome): Extract<CommandOutcome, { ok: true }>["output"] {
  if (!outcome.ok) throw new Error(`${outcome.error.code}: ${outcome.error.message}`);
  return outcome.output;
}

/** A workspace with one chat, created the way the page does it. */
export async function newChat(directory: DirectoryClient): Promise<{ workspaceId: string; chatId: number }> {
  const workspaceId = newId();
  expectOk(await directory.send({ type: "workspace.create", workspaceId, name: "Team" }));
  return { workspaceId, chatId: await addChat(directory, workspaceId) };
}

export async function addChat(directory: DirectoryClient, workspaceId: string): Promise<number> {
  const output = expectOk(await directory.send({ type: "chat.create", workspaceId }));
  if (output.kind !== "chat") throw new Error("No chat");
  return output.chatId;
}
