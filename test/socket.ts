import type { SocketLike } from "~/modules/connection/types.ts";
import { sessionOf, worker } from "./client.ts";

type Listener = (event: never) => void;

/** A socket to the real server that a test can drop and bring back, as a network would. */
export class TestSocket implements SocketLike {
  readonly sent: { type: string; requestId?: string }[] = [];
  readonly #listeners = new Map<string, Listener[]>();
  readonly #path: string;
  readonly #name: string;
  #socket: WebSocket | undefined;

  constructor(path: string, name: string) {
    this.#path = path;
    this.#name = name;
  }

  get readyState(): number {
    return this.#socket?.readyState ?? 0;
  }
  async connect(): Promise<void> {
    const response = await worker.fetch(`https://app.test${this.#path}`, {
      headers: { Upgrade: "websocket", cookie: await sessionOf(this.#name) },
    });
    const socket = response.webSocket as unknown as WebSocket & { accept(): void };
    this.#socket = socket;
    socket.addEventListener("message", (event) => this.#socket === socket && this.#emit("message", event));
    socket.addEventListener("close", (event) => this.#socket === socket && this.#emit("close", event));
    this.#emit("open", {});
    socket.accept();
  }
  drop(): void {
    const socket = this.#socket;
    this.#socket = undefined;
    socket?.close(1000, "dropped");
    this.#emit("close", { code: 1006 });
  }
  send(data: string): void {
    this.sent.push(JSON.parse(data));
    this.#socket?.send(data);
  }
  close(code?: number, reason?: string): void {
    this.#socket?.close(code, reason);
  }
  addEventListener(type: string, listener: Listener): void {
    this.#listeners.set(type, [...(this.#listeners.get(type) ?? []), listener]);
  }
  #emit(type: string, event: unknown): void {
    for (const listener of this.#listeners.get(type) ?? []) listener(event as never);
  }
}
