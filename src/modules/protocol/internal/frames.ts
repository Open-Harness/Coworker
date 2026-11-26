import type { Parsed } from "../types.ts";

const MARKER = "\u0001";

/**
 * Splits a message that would exceed one frame. A whole message starts with `{`; a piece starts with the marker, a
 * message id, its index and the piece count. WebSocket order is preserved, so pieces of one message are contiguous.
 */
export function splitFrame(message: string, id: string, limit: number): readonly string[] {
  if (message.length <= limit) return [message];
  const count = Math.ceil(message.length / limit);
  return Array.from(
    { length: count },
    (_, index) => `${MARKER}${id} ${index} ${count} ${message.slice(index * limit, (index + 1) * limit)}`,
  );
}

const HEADER = new RegExp(`^${MARKER}(\\S+) (\\d+) (\\d+) `, "u");

/** Puts split messages together again. `undefined` while a message is incomplete. */
export class FrameJoiner {
  #id = "";
  #pieces: string[] = [];

  push(frame: string): Parsed<string | undefined> {
    if (!frame.startsWith(MARKER)) return { ok: true, value: frame };
    const header = HEADER.exec(frame);
    if (header === null) return { ok: false, message: "A split frame has no header" };
    const [prefix, id, index, count] = header as unknown as [string, string, string, string];
    if (index === "0") {
      this.#id = id;
      this.#pieces = [];
    }
    if (id !== this.#id || Number(index) !== this.#pieces.length) {
      return { ok: false, message: "A split frame is out of order" };
    }
    this.#pieces.push(frame.slice(prefix.length));
    if (this.#pieces.length < Number(count)) return { ok: true, value: undefined };
    const whole = this.#pieces.join("");
    this.#pieces = [];
    return { ok: true, value: whole };
  }
}
