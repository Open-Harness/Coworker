import type { Answer } from "~/modules/api/types.ts";
import type { Message } from "~/modules/completion/types.ts";
import { doings } from "~/modules/doings/service.ts";
import { playbooks } from "~/modules/playbook/service.ts";
import type { Files, Problem } from "~/modules/playbook/types.ts";
import { settingUp } from "~/modules/setting-up/service.ts";
import type { SetUpDeps } from "~/modules/setting-up/types.ts";
import type { Walkthrough } from "~/modules/walkthrough/types.ts";
import type { Comment } from "~/modules/views-manager/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { accountsOf, ok, problem, surroundings, whoOf, wholeOf } from "./around.ts";
import { born } from "./born.ts";
import { setUpView } from "./set-up-view.ts";

/* Setting a manager up from a sentence: what the console gives `setting-up`, and its two paths. */

const WALKS = "walk";

const wordsOf = (found: readonly Problem[]): readonly string[] =>
  found.map((one) => `${one.at}${one.line === undefined ? "" : ` (${one.line})`}: ${one.says}`);

async function problemsOf(c: ConsoleDeps, files: Files): Promise<readonly string[]> {
  const read = playbooks.read(files);
  if (read._tag === "Problems") return wordsOf(read.problems);
  return wordsOf(playbooks.check(read.playbook, await surroundings(c, wholeOf(await accountsOf(c)))));
}

const caseWords = (walk: Walkthrough): readonly string[] =>
  walk.cases.map(
    (one) => `${one.what}. You would: ${one.would}. What happened: ${one.happened}. You said it was ${one.said ?? "not judged"}.`,
  );

/** The draft with the cases judged as its first evals: on the part that is the whole of it, or the first there is. */
function withCases(walk: Walkthrough): Files | undefined {
  const read = playbooks.read(walk.draft ?? {});
  if (read._tag === "Problems") return undefined;
  const { playbook } = read;
  const whole = playbook.evals.find(({ of }) => of === "playbook") ?? playbook.evals[0];
  const evals =
    whole === undefined
      ? [
          {
            id: "set-up",
            of: "playbook",
            good: playbook.objective.said,
            judge: { person: playbook.objective.owner },
            cases: caseWords(walk),
            line: { value: playbook.objective.aim.value, unit: playbook.objective.measure.unit },
          },
        ]
      : playbook.evals.map((one) => (one === whole ? { ...one, cases: [...one.cases, ...caseWords(walk)] } : one));
  return playbooks.write({ ...playbook, evals });
}

/** What `setting-up` is given by this request. */
export function depsOf(c: ConsoleDeps): SetUpDeps {
  return {
    walks: {
      get: async (id) => ((await c.store.kept(WALKS)) as readonly Walkthrough[]).find((one) => one.id === id),
      put: (walk) => c.store.keep(WALKS, walk.id, walk),
    },
    thread: (walk) => ({
      messages: async () => (await c.store.messages(`set-up:${walk}`)) as readonly Message[],
      add: (message) => c.store.addMessage(`set-up:${walk}`, message),
    }),
    models: async () => ({ connections: await c.outside.connections(), choice: await choiceOf(c) }),
    call: (path, body) => c.outside.call(path, body),
    newId: () => c.ids.next("walk"),
    problems: (draft) => problemsOf(c, draft),
    make: async (walk) => {
      const files = withCases(walk);
      if (files === undefined || walk.made === null) return { _tag: "Refused", why: "The draft does not read, so nothing is made." };
      const made = await born(c, { id: walk.made, files });
      return made._tag === "Born" ? { _tag: "Made" } : { _tag: "Refused", why: wordsOf(made.problems).join(" ") };
    },
    comment: async ({ manager, text, by }) => {
      const row = (await c.store.managers()).find(({ node }) => node.id === manager);
      if (row === undefined) return;
      const id = c.ids.next("cm");
      const comment: Comment = { id, on: "page", part: "Playbook", by, at: c.clock.now(), text, quote: null, became: { _tag: "Open" } };
      await c.managers.get(row.objectId, row.region).keep("comment", id, comment);
    },
  };
}

const THINKING = ["off", "low", "medium", "high"] as const;

/** The workspace's own choice of model, as the console keeps it. */
async function choiceOf(c: ConsoleDeps) {
  const value = await c.store.setting("choice");
  const one = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const level = THINKING.find((name) => name === one["thinking"]);
  return typeof one["connection"] === "string" && typeof one["model"] === "string"
    ? { connection: one["connection"], model: one["model"], thinking: level ?? "low" }
    : null;
}

const mayMake = (c: ConsoleDeps) => doings.may("manager.make", whoOf(c.who));

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export async function startSetUp(c: ConsoleDeps, body: unknown): Promise<Answer<unknown>> {
  const said = isRecord(body) && typeof body["said"] === "string" ? body["said"].trim() : "";
  if (said === "") return problem(422, "Say what you want to get to.");
  const may = mayMake(c);
  if (may.is !== "on") return problem(403, `You may not make a manager: ${may.why}`);
  const started = await settingUp.start(depsOf(c), c.who.name, said);
  return ok({ walk: started.walk });
}

export async function readSetUp(c: ConsoleDeps, id: string): Promise<Answer<unknown>> {
  const walk = await settingUp.get(depsOf(c), id);
  return walk === undefined ? problem(404, `There is no set-up ${id} here.`) : ok(setUpView(walk));
}

export async function sayInSetUp(c: ConsoleDeps, id: string, body: unknown): Promise<Answer<unknown>> {
  const may = mayMake(c);
  if (may.is !== "on") return ok({ _tag: "Refused", why: `You may not make a manager: ${may.why}` });
  const said = await settingUp.say(depsOf(c), id, c.who.name, body);
  if (said._tag === "Gone") return problem(404, `There is no set-up ${id} here.`);
  return ok(said._tag === "Said" ? setUpView(said.walk) : { _tag: "Refused", why: said.why });
}
