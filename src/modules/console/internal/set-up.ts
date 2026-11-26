import type { Answer } from "~/modules/api/types.ts";
import type { Walkthrough } from "~/modules/walkthrough/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { ok, problem } from "./around.ts";
import { setUpView } from "./set-up-view.ts";

/*
 * Setting a manager up from a sentence. The walk is a conversation with the co-worker, so it is the loop's (`agent.answer`),
 * and the loop is not built: a set-up already kept can be read, and nothing new is begun or said in.
 */

const WALKS = "walk";
const NOT_BUILT = "Setting up from a sentence is not built yet: it is a conversation with the co-worker, and the agent loop is not built.";

export async function startSetUp(_c: ConsoleDeps, _body: unknown): Promise<Answer<unknown>> {
  return problem(500, NOT_BUILT);
}

export async function readSetUp(c: ConsoleDeps, id: string): Promise<Answer<unknown>> {
  const walk = ((await c.store.kept(WALKS)) as readonly Walkthrough[]).find((one) => one.id === id);
  return walk === undefined ? problem(404, `There is no set-up ${id} here.`) : ok(setUpView(walk));
}

export async function sayInSetUp(_c: ConsoleDeps, _id: string, _body: unknown): Promise<Answer<unknown>> {
  return ok({ _tag: "Refused", why: NOT_BUILT });
}
