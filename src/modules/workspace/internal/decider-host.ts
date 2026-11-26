import { decidingOf } from "./deciding-host.ts";
import { followingOf } from "./following-host.ts";
import { SettingsHost } from "./settings-host.ts";

/** What came in is decided from the object's alarm, so that an object that was lost decides it when it is back. */
export abstract class DecidingHost<Env> extends SettingsHost<Env> {
  /** Wakes the object in `after` milliseconds of the clock's time, unless it wakes sooner for something else. */
  protected async wakeFor(after: number): Promise<void> {
    const at = Date.now() + Math.max(after, 0);
    const set = await this.ctx.storage.getAlarm();
    if (set === null || set > at) await this.ctx.storage.setAlarm(at);
  }

  /** What is due now is done: what came in is decided, and what a judge did not answer is asked again. */
  async tick(): Promise<void> {
    if (!this.provisioned()) return;
    await this.decide();
  }

  protected async decide(): Promise<number | null> {
    const deciding = decidingOf({
      sql: this.ctx.storage.sql,
      dependencies: this.dependencies,
      connections: () => this.modelConnections(),
      modelCall: (call) => this.modelCall(call),
    });
    const soon = (): { readonly again: number } => ({ again: this.dependencies.clock.now() + 30_000 });
    const decided = await deciding.run().catch(soon);
    // What became true of a conversation that work follows is told to that work, after what people said is decided.
    const followed = await followingOf(this.ctx.storage.sql, this.dependencies).run().catch(soon);
    const again = [decided.again, followed.again].reduce<number | null>(
      (least, one) => (one === null ? least : Math.min(least ?? one, one)),
      null,
    );
    if (again !== null) await this.wakeFor(again - this.dependencies.clock.now());
    return again;
  }

  /** The object's alarm: what came in is decided, then the sign-ins that are about to expire are refreshed; it wakes again for whatever is still owed. */
  override async alarm(): Promise<void> {
    if (!this.provisioned()) return;
    // The sign-ins first: it sets or clears the one alarm, and what is owed after it is set again by `decide`.
    await super.alarm();
    await this.decide();
  }
}
