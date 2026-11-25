import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { createRegistry, Harness } from "@earendil-works/pi-durable";
import { openDurableObjectSqliteStorage } from "@earendil-works/pi-durable/storage/sqlite/cloudflare";
import { mount } from "~/modules/agent-engine/service.ts";
import type { Models, Mounted } from "~/modules/agent-engine/types.ts";
import type { Brain, ManagerDependencies } from "../types.ts";
import { Alarm } from "./alarm.ts";
import type { ToolEffects } from "./asking.ts";
import { manager } from "./manager-agent.ts";
import { BoardDoc } from "./state.ts";
import { worker } from "./worker.ts";

/** Every kind of agent in a manager's object, and the model each saved agent's choice names. */
function agentsFor(brain: Brain, effects: ToolEffects) {
  const models: Models = { modelFor: (choice) => ({ ...(brain.modelFor?.(choice) ?? brain.model) }) };
  const runs = mount(worker, effects, models);
  const use = { manager: mount(manager, { effects, worker: runs }, models), worker: runs };
  const registry = createRegistry();
  for (const { extension } of Object.values(use)) registry.install(extension);
  return { registry, use };
}

export interface Engine {
  readonly harness: Harness;
  /** Makes a run's conversation the agent it is. */
  readonly worker: Mounted;
  /** Call before anything that may start work: a process that dies right after is still woken to do it. */
  expectWork(): Promise<void>;
  /** Continues work a lost process left, and makes due sleeps runnable. */
  resume(): Promise<void>;
  close(): Promise<void>;
}

export async function openEngine(
  ctx: DurableObjectState,
  brain: Brain,
  effects: ToolEffects,
  report: ManagerDependencies["report"],
): Promise<Engine> {
  const alarm = new Alarm(ctx.storage);
  await alarm.fallback();
  const storage = await openDurableObjectSqliteStorage(ctx.storage);
  const { registry, use } = agentsFor(brain, effects);
  let closing = false;
  const harness = await Harness.open(
    storage,
    {
      models: brain.models,
      registry,
      settings: { extensions: [use.manager.extension] },
      conversationCreated: async (tx, conversation) => {
        if (conversation.owner === undefined && conversation.parent === undefined) {
          await use.manager.configure(tx, conversation.id, undefined);
        }
      },
      onReport: ({ error }) => report("The manager's engine reported a failure", error),
      // The engine keeps no timer for sleeps; the alarm calls `resume()`. An object that cannot set its alarm would
      // lose work silently, so it is reset instead and arms again when it restarts.
      onWake: (wake) => {
        if (!closing) void alarm.arm(wake).catch(() => ctx.abort("The alarm could not be set"));
      },
    },
    BACKGROUND_CONTEXT,
  );
  // A run's model is named in the brain's catalogue, which a restart empties: name each again before any run goes on.
  const board = await harness.snapshot(BoardDoc, BACKGROUND_CONTEXT);
  for (const run of Object.values(board?.runs ?? {})) if (run.model !== undefined) brain.modelFor?.({ ...run.model });
  void harness.closed.then((end) => {
    if (end.kind === "failed") ctx.abort("The engine failed");
  });
  return {
    harness,
    worker: use.worker,
    expectWork: () => alarm.arm({ ...harness.wake(), active: true }),
    resume: async () => {
      await alarm.arm({ ...harness.wake(), active: true });
      harness.resume();
      await alarm.arm(harness.wake());
    },
    close: async () => {
      closing = true;
      await harness.close(BACKGROUND_CONTEXT);
    },
  };
}
