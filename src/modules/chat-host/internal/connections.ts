import type { Person } from "~/modules/protocol/types.ts";
import type { Presence, WorkspaceEvent } from "~/modules/protocol/types.ts";
import { LIMITS, newId, splitFrame } from "~/modules/protocol/service.ts";

/** `WebSocket.OPEN`, which Workers name differently. */
const OPEN = 1;

/** Survives hibernation as the socket's attachment. */
export interface ConnectionState {
  readonly person: Person;
  readonly chatId?: number;
  readonly typing?: true;
}

const isConnectionState = (value: unknown): value is ConnectionState =>
  typeof value === "object" &&
  value !== null &&
  "person" in value &&
  typeof value.person === "object" &&
  value.person !== null &&
  "id" in value.person &&
  "name" in value.person;

export class Connections {
  constructor(readonly ctx: DurableObjectState) {}

  accept(socket: WebSocket, person: Person): void {
    this.ctx.acceptWebSocket(socket);
    this.setState(socket, { person });
  }

  open(): readonly WebSocket[] {
    return this.ctx.getWebSockets().filter((socket) => socket.readyState === OPEN);
  }

  state(socket: WebSocket): ConnectionState | undefined {
    const attachment: unknown = socket.deserializeAttachment();
    return isConnectionState(attachment) ? attachment : undefined;
  }

  setState(socket: WebSocket, state: ConnectionState): void {
    if (socket.readyState === OPEN) socket.serializeAttachment(state);
  }

  send(socket: WebSocket, event: WorkspaceEvent): void {
    if (socket.readyState !== OPEN) return;
    try {
      for (const frame of splitFrame(JSON.stringify(event), newId(), LIMITS.serverFrame)) socket.send(frame);
    } catch {
      this.close(socket, 1011, "Could not send");
    }
  }

  broadcast(event: WorkspaceEvent): void {
    for (const socket of this.open()) this.send(socket, event);
  }

  close(socket: WebSocket, code: number, reason: string): void {
    try {
      socket.close(code, reason);
    } catch {
      // Already closed.
    }
  }

  /** Everyone here, once per person and chat. */
  presence(): readonly Presence[] {
    const found = new Map<string, Presence>();
    for (const socket of this.open()) {
      const state = this.state(socket);
      if (state === undefined) continue;
      const key = `${state.person.id} ${state.chatId ?? ""}`;
      found.set(key, {
        person: state.person,
        ...(state.chatId === undefined ? {} : { chatId: state.chatId }),
        typing: state.typing === true || found.get(key)?.typing === true,
      });
    }
    return [...found.values()];
  }
}
