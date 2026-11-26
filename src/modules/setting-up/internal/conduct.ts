import { turns } from "~/modules/turns/service.ts";
import type { Turned } from "~/modules/turns/types.ts";
import { walkthroughs } from "~/modules/walkthrough/service.ts";
import type { WalkEvent, Walkthrough } from "~/modules/walkthrough/types.ts";
import type { SetUpDeps, SettingUp } from "../types.ts";
import { readOfPerson } from "./read.ts";
import { step } from "./step.ts";
import { setUpTool } from "./tool.ts";
import * as words from "./words.ts";

const ENDED = new Set(["made", "thrown away", "carried by another"]);

/** The co-worker's turn: it is told what happened, and calls `set_up` until it has nothing more to say. */
async function ask(deps: SetUpDeps, id: string, told: string): Promise<Turned> {
  const thread = deps.thread(id);
  if ((await thread.messages()).length === 0) await thread.add({ role: "system", content: words.SYSTEM });
  await thread.add({ role: "user", content: told });
  return turns.run({ thread, models: deps.models, call: deps.call, tools: [setUpTool(deps, id)] });
}

/** What the person's event tells the co-worker, when it is for it to go on. */
function toldOf(walk: Walkthrough, event: WalkEvent, by: string): string | undefined {
  switch (event.is) {
    case "answers":
      return words.answered(walk, event.by, event.answers);
    case "connected":
      return words.connected(by, event.connector);
    case "skipped":
      return words.skipped(by, event.connector);
    case "that is wrong":
      return words.wrongFinding(by, event.finding, event.says);
    default:
      return undefined;
  }
}

async function start(deps: SetUpDeps, by: string, said: string) {
  const id = deps.newId();
  await deps.walks.put(walkthroughs.start(id, by, said));
  const turned = await ask(deps, id, words.opening(by, said));
  return { walk: id, note: turned._tag === "Failed" ? turned.why : null };
}

async function say(deps: SetUpDeps, id: string, by: string, raw: unknown) {
  const walk = await deps.walks.get(id);
  if (walk === undefined) return { _tag: "Gone" } as const;
  const event = readOfPerson(raw, by);
  if (event._tag === "Wrong") return { _tag: "Refused", why: event.says } as const;
  const said = await step(deps, walk, event.value);
  const told = said._tag === "Said" && !ENDED.has(said.walk.stage) ? toldOf(walk, event.value, by) : undefined;
  if (said._tag === "Refused" || told === undefined) return said;
  await ask(deps, id, told);
  return { _tag: "Said", walk: (await deps.walks.get(id)) ?? said.walk } as const;
}

export const settingUp: SettingUp = { start, say, get: (deps, id) => deps.walks.get(id) };
