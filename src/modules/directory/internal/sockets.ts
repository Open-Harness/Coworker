import type { Person } from "~/modules/protocol/types.ts";
import { LIMITS, newId, splitFrame } from "~/modules/protocol/service.ts";
import type { DirectoryEvent } from "~/modules/protocol/types.ts";

const OPEN = 1;

const isPerson = (value: unknown): value is Person => typeof value === "object" && value !== null && "id" in value && "name" in value;

export class Sockets {
  constructor(readonly ctx: DurableObjectState) {}

  accept(socket: WebSocket, person: Person): void {
    this.ctx.acceptWebSocket(socket);
    socket.serializeAttachment(person);
  }

  person(socket: WebSocket): Person | undefined {
    const attachment: unknown = socket.deserializeAttachment();
    return isPerson(attachment) ? attachment : undefined;
  }

  open(): readonly WebSocket[] {
    return this.ctx.getWebSockets().filter((socket) => socket.readyState === OPEN);
  }

  /** Everyone with a page open, once each. */
  people(): readonly Person[] {
    const found = new Map<string, Person>();
    for (const socket of this.open()) {
      const person = this.person(socket);
      if (person !== undefined) found.set(person.id, person);
    }
    return [...found.values()].sort((left, right) => left.name.localeCompare(right.name));
  }

  send(socket: WebSocket, event: DirectoryEvent): void {
    this.#write(socket, splitFrame(JSON.stringify(event), newId(), LIMITS.serverFrame));
  }

  broadcast(event: DirectoryEvent): void {
    const frames = splitFrame(JSON.stringify(event), newId(), LIMITS.serverFrame);
    for (const socket of this.open()) this.#write(socket, frames);
  }

  close(socket: WebSocket, code: number, reason: string): void {
    try {
      socket.close(code, reason);
    } catch {
      // Already closed.
    }
  }

  #write(socket: WebSocket, frames: readonly string[]): void {
    if (socket.readyState !== OPEN) return;
    try {
      for (const frame of frames) socket.send(frame);
    } catch {
      this.close(socket, 1011, "Could not send");
    }
  }
}
