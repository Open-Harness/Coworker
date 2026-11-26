import type { DirectoryPort, Projection, Report } from "../types.ts";

const RETRY_MS = [500, 2_000, 10_000, 30_000] as const;

/** Keeps the directory's copy current: one publication at a time, the latest state, retried while it fails. */
export class Projector {
  #dirty = false;
  #running: Promise<void> | undefined;

  constructor(
    readonly directory: DirectoryPort,
    readonly report: Report,
    readonly build: () => Promise<Projection | undefined>,
  ) {}

  /** Resolves once the directory has this state or the attempts are used up. The next change tries again. */
  publish(): Promise<void> {
    this.#dirty = true;
    this.#running ??= this.#drain().finally(() => {
      this.#running = undefined;
    });
    return this.#running;
  }

  async #drain(): Promise<void> {
    let attempt = 0;
    while (this.#dirty) {
      this.#dirty = false;
      if (await this.#attempt()) {
        attempt = 0;
        continue;
      }
      const delay = RETRY_MS[attempt++];
      if (delay === undefined) return;
      this.#dirty = true;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  async #attempt(): Promise<boolean> {
    try {
      const projection = await this.build();
      return projection === undefined || (await this.directory.publish(projection)).ok;
    } catch (error) {
      this.report("The directory was not updated", error);
      return false;
    }
  }
}
