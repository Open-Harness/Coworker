import { DecidingHost } from "./decider-host.ts";
import { connection } from "./github.ts";
import { readProfile } from "./store.ts";
import { morningList, untilMorning } from "./morning.ts";
import { look } from "./weekly.ts";

/** What is due now includes the week's look: each manager not looked at for a week is, by the co-worker, as itself. */
export abstract class LookingHost<Env> extends DecidingHost<Env> {
  #looking: Promise<void> | undefined;

  override async tick(): Promise<void> {
    await super.tick();
    await this.#lookWeekly();
    await this.#morning();
  }

  /** Whenever the object wakes, a look that is due is made. */
  override async alarm(): Promise<void> {
    await super.alarm();
    await this.#lookWeekly();
    await this.#morning();
  }

  /** What waits for each person is listed to them once each day, and the object wakes for the next morning. */
  async #morning(): Promise<void> {
    const profile = readProfile(this.ctx.storage.sql);
    if (profile === undefined) return;
    const now = this.dependencies.clock.now();
    await morningList(this.ctx.storage.sql, this.asking(), now, profile.createdAt);
    await this.wakeFor(untilMorning(now));
  }

  /** The week's look, once at a time: the one in hand is the one asked for. */
  #lookWeekly(): Promise<void> {
    const profile = readProfile(this.ctx.storage.sql);
    if (profile === undefined) return Promise.resolve();
    this.#looking ??= look({
      sql: this.ctx.storage.sql,
      dependencies: this.dependencies,
      profile,
      connections: () => this.modelConnections(),
      secrets: () => this.secrets(),
      github: async () => connection(this.ctx.storage.sql),
      modelCall: (call) => this.modelCall(call),
    })
      .catch(() => undefined)
      .finally(() => void (this.#looking = undefined));
    return this.#looking;
  }
}
