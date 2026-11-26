import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { Harness } from "@earendil-works/pi-durable";
import { openDurableObjectSqliteStorage } from "@earendil-works/pi-durable/storage/sqlite/cloudflare";
import type { Agent } from "~/modules/agent/types.ts";
import type { Report } from "../types.ts";
import { Alarm } from "./alarm.ts";

export interface Engine {
  readonly harness: Harness;
  /** Call before anything that may start work: a process that dies right after is still woken to do it. */
  expectWork(): Promise<void>;
  /** Continues work a lost process left, and makes due sleeps runnable. */
  resume(): Promise<void>;
  close(): Promise<void>;
}

export async function openEngine(ctx: DurableObjectState, agent: Agent, report: Report): Promise<Engine> {
  const alarm = new Alarm(ctx.storage);
  await alarm.fallback();
  const storage = await openDurableObjectSqliteStorage(ctx.storage);
  let closing = false;
  const harness = await Harness.open(
    storage,
    {
      ...agent.harnessOptions,
      onReport: ({ error, ...details }) => report("The engine reported a failure", error, details),
      // The engine keeps no timer for sleeps; the alarm calls `resume()`. An object that cannot set its alarm would
      // lose work silently, so it is reset instead and arms again when it restarts.
      onWake: (wake) => {
        if (!closing) void alarm.arm(wake).catch(() => ctx.abort("The alarm could not be set"));
      },
    },
    BACKGROUND_CONTEXT,
  );
  // A storage error closes the engine. Reset the object so the next event reopens it.
  void harness.closed.then((end) => {
    if (end.kind === "failed") ctx.abort("The engine failed");
  });
  return {
    harness,
    expectWork: () => alarm.arm({ ...harness.wake(), active: true }),
    resume: async () => {
      await alarm.arm({ ...harness.wake(), active: true });
      harness.resume();
      // `onWake` repeats no unchanged wake: without this an early alarm would leave the heartbeat on with nothing to do.
      await alarm.arm(harness.wake());
    },
    close: async () => {
      closing = true;
      await harness.close(BACKGROUND_CONTEXT);
    },
  };
}
