import { threads } from "~/modules/threads/service.ts";
import type { TurnTool } from "~/modules/turns/types.ts";
import type { SetUpDeps } from "../types.ts";
import { readOfCoworker } from "./read.ts";
import { step } from "./step.ts";

/** `set_up`: the co-worker says the next event. Code answers in words: what it is now, or why it may not. */
export const setUpTool = (deps: SetUpDeps, id: string): TurnTool => ({
  name: "set_up",
  description: "Say the next step of setting a manager up, as one event. Code checks it and answers.",
  parameters: {
    type: "object",
    properties: { event: { type: "object", description: "The event: `is` says which, and the rest is what it needs." } },
    required: ["event"],
  },
  run: async (args) => {
    const called = threads.read("set_up", args);
    if (called._tag === "Wrong") return called.says;
    const event = readOfCoworker(called.args.event);
    if (event._tag === "Wrong") return `Refused: ${event.says}`;
    const walk = await deps.walks.get(id);
    if (walk === undefined) return "There is no such set-up.";
    const said = await step(deps, walk, event.value);
    return said._tag === "Refused" ? `Refused: ${said.why}` : `Done. It is at "${said.walk.stage}".`;
  },
});
