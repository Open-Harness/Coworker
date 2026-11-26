import type { CommandOutcome } from "~/modules/protocol/types.ts";

interface Waiting {
  readonly text: string;
  readonly lasting: boolean;
  readonly resolve: (outcome: CommandOutcome) => void;
}

const offline: CommandOutcome = { ok: false, error: { code: "unavailable", message: "The server cannot be reached" } };

/** Commands without an answer yet, in the order they were given. */
export class Outbox {
  readonly #waiting = new Map<string, Waiting>();

  add(requestId: string, text: string, lasting: boolean): Promise<CommandOutcome> {
    return new Promise((resolve) => this.#waiting.set(requestId, { text, lasting, resolve }));
  }

  settle(requestId: string, outcome: CommandOutcome): void {
    const waiting = this.#waiting.get(requestId);
    this.#waiting.delete(requestId);
    waiting?.resolve(outcome);
  }

  /** Everything to send again on a new socket. */
  texts(): readonly string[] {
    return [...this.#waiting.values()].map(({ text }) => text);
  }

  /** The socket dropped: reads fail, changes wait for the next socket. */
  dropPassing(): void {
    for (const [requestId, { lasting }] of this.#waiting) if (!lasting) this.settle(requestId, offline);
  }

  clear(): void {
    for (const requestId of this.#waiting.keys()) this.settle(requestId, offline);
  }
}
