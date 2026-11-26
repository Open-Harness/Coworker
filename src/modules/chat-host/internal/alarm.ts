import type { Wake } from "@earendil-works/pi-durable";

/** While work can run the alarm stays this far ahead, so an object that died is woken to resume it. */
export const HEARTBEAT_MS = 60_000;

/** The object's one alarm: the earliest sleep, or a heartbeat while work can run, whichever comes first. */
export class Alarm {
  #writes: Promise<void> = Promise.resolve();

  constructor(readonly storage: DurableObjectStorage) {}

  /** Called before anything that can throw on open: a workspace whose recovery fails is started again. */
  async fallback(): Promise<void> {
    const at = Date.now() + HEARTBEAT_MS;
    const current = await this.storage.getAlarm();
    if (current === null || current > at) await this.storage.setAlarm(at);
  }

  /** Serialized, so an older wake cannot overwrite a newer, earlier deadline. */
  arm(wake: Wake): Promise<void> {
    const write = this.#writes.then(async () => {
      const heartbeat = wake.active ? Date.now() + HEARTBEAT_MS : Number.POSITIVE_INFINITY;
      const at = Math.min(heartbeat, wake.at ?? Number.POSITIVE_INFINITY);
      if (at === Number.POSITIVE_INFINITY) await this.storage.deleteAlarm();
      else await this.storage.setAlarm(at);
    });
    this.#writes = write.catch(() => undefined);
    return write;
  }
}
