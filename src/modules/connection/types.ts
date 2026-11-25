import type { CommandError, CommandOutcome, CommandResult, Parsed, ProtocolError } from "~/modules/protocol/types.ts";

/** `missing`: the server says there is nothing here. `outdated`: the page is too old for the server. */
export type ConnectionStatus = "connecting" | "connected" | "missing" | "outdated";

/** The part of a WebSocket this uses, so tests can stand in for one. */
export interface SocketLike {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: "open" | "error", listener: () => void): void;
  addEventListener(type: "message", listener: (event: { readonly data: unknown }) => void): void;
  addEventListener(type: "close", listener: (event: { readonly code: number }) => void): void;
}

export interface ConnectionOptions<Command extends object, Event> {
  /** Opens a socket that reconnects by itself while `shouldReconnect` says so. */
  readonly open: (shouldReconnect: (code: number) => boolean) => SocketLike;
  readonly parse: (text: string) => Parsed<Event | CommandResult | ProtocolError>;
  readonly onEvent: (event: Event) => void;
  readonly onStatus: (status: ConnectionStatus) => void;
  /** Something a person should see: a refused message, or a page that must be reloaded. */
  readonly onError: (message: string) => void;
  /** Commands a new socket needs before the ones waiting for an answer are sent again. */
  readonly onOpen?: () => readonly Command[];
}

export interface Connection<Command extends object> {
  /**
   * Sends a command and resolves with its result. A lasting command is sent again, with the same id, until the server
   * answers; a passing one (a read) fails when the socket drops.
   */
  send(command: Unsent<Command>, options?: { readonly lasting: boolean }): Promise<CommandOutcome>;
  /** Sends something nobody waits for. Lost while offline. */
  notify(message: object): void;
  /** Stops for good: what is still waiting fails. */
  close(reason?: ConnectionStatus): void;
}

export type Unsent<Command> = Command extends unknown ? Omit<Command, "requestId"> : never;
export type { CommandError, CommandOutcome };
