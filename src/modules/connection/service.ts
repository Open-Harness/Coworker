import { WebSocket as ReconnectingWebSocket } from "partysocket";
import { FrameJoiner, newId, PROTOCOL_VERSION } from "~/modules/protocol/service.ts";
import type { CommandResult, ProtocolError } from "~/modules/protocol/types.ts";
import { Outbox } from "./internal/outbox.ts";
import type { Connection, ConnectionOptions, ConnectionStatus, SocketLike } from "./types.ts";

const OPEN = 1;
const CLOSED_MISSING = 4404;
const CLOSED_BY_PAGE = 1000;

/** A browser socket that reconnects with growing pauses. */
export const openBrowserSocket = (url: string, shouldReconnect: (code: number) => boolean): SocketLike =>
  new ReconnectingWebSocket(url, [], {
    // Waiting commands are kept here instead, so a message is never sent to a socket that was not set up.
    maxEnqueuedMessages: 0,
    maxReconnectionDelay: 8_000,
    shouldReconnectOnClose: ({ code }: { code: number }) => shouldReconnect(code),
  }) as unknown as SocketLike;

type Envelope = { readonly type: string; readonly requestId?: string; readonly protocol?: number };

class LiveConnection<Command extends object, Event> implements Connection<Command> {
  readonly #options: ConnectionOptions<Command, Event>;
  readonly #outbox = new Outbox();
  readonly #socket: SocketLike;
  #joiner = new FrameJoiner();
  #ready = false;
  #ended = false;

  constructor(options: ConnectionOptions<Command, Event>) {
    this.#options = options;
    this.#socket = options.open((code) => !this.#ended && code !== CLOSED_MISSING);
    this.#socket.addEventListener("open", () => {
      this.#joiner = new FrameJoiner();
      this.#ready = false;
    });
    this.#socket.addEventListener("message", ({ data }) => this.#receive(String(data)));
    this.#socket.addEventListener("close", ({ code }) => this.#dropped(code));
  }

  send(command: object, options: { readonly lasting: boolean } = { lasting: true }) {
    const requestId = newId();
    const text = JSON.stringify({ ...command, requestId });
    const outcome = this.#outbox.add(requestId, text, options.lasting);
    if (this.#ended || (!options.lasting && !this.#ready)) this.#outbox.settle(requestId, unreachable);
    else if (this.#ready) this.#write(text);
    return outcome;
  }

  notify(message: object): void {
    if (this.#ready) this.#write(JSON.stringify(message));
  }

  close(reason?: ConnectionStatus): void {
    if (this.#ended) return;
    this.#ended = true;
    this.#ready = false;
    this.#outbox.clear();
    this.#socket.close(CLOSED_BY_PAGE, "The page is done");
    if (reason !== undefined) this.#options.onStatus(reason);
  }

  #write(text: string): void {
    if (this.#socket.readyState === OPEN) this.#socket.send(text);
  }

  #receive(frame: string): void {
    if (this.#ended) return;
    const joined = this.#joiner.push(frame);
    if (joined.ok && joined.value === undefined) return;
    const parsed = joined.ok ? this.#options.parse(joined.value!) : joined;
    // A page that cannot read the server is older or newer than it. Reloading brings them together.
    if (!parsed.ok) return this.close("outdated");
    const event = parsed.value as Envelope;
    if (event.protocol !== undefined && event.protocol !== PROTOCOL_VERSION) return this.close("outdated");
    if (event.type === "command.result") {
      const { requestId, ...outcome } = event as unknown as CommandResult;
      return this.#outbox.settle(requestId, outcome);
    }
    if (event.type === "error") return this.#options.onError((event as unknown as ProtocolError).message);
    this.#options.onEvent(parsed.value as Event);
    if (event.protocol !== undefined) this.#started();
  }

  /** The snapshot arrived: restore what the page had open, then send what is still waiting for an answer. */
  #started(): void {
    this.#ready = true;
    this.#options.onStatus("connected");
    for (const command of this.#options.onOpen?.() ?? []) this.#write(JSON.stringify(command));
    for (const text of this.#outbox.texts()) this.#write(text);
  }

  #dropped(code: number): void {
    this.#ready = false;
    if (this.#ended) return;
    if (code === CLOSED_MISSING) return this.close("missing");
    this.#outbox.dropPassing();
    this.#options.onStatus("connecting");
  }
}

const unreachable = {
  ok: false,
  error: { code: "unavailable", message: "The server cannot be reached" },
} as const;

export const connect = <Command extends object, Event>(options: ConnectionOptions<Command, Event>): Connection<Command> =>
  new LiveConnection<Command, Event>(options);
