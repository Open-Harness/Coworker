import { askJudge } from "~/modules/deciding/service.ts";
import type { Hears } from "~/modules/intake/types.ts";
import { playbooks } from "~/modules/playbook/service.ts";
import type { AgentRole, Change, Files, Playbook } from "~/modules/playbook/types.ts";
import { trials } from "~/modules/trials/service.ts";
import type { CaseRun, Trial } from "~/modules/trials/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { accountsOf, surroundings, wholeOf } from "./around.ts";
import { judgeCases, type JudgeCase } from "./cases.ts";
import type { Open } from "./managers.ts";

/* A change tried beside what is there: the same cases, each judged again with the words as they are and as they would become. */

/** How many times each case is run for each version: more than once, so that how far it moves by itself is known. */
const RUNS = 2;

export type Tried =
  | { readonly _tag: "Tried"; readonly trial: Omit<Trial, "id" | "says">; readonly next: Playbook; readonly files: Files }
  | { readonly _tag: "Refused"; readonly why: string };

const hearsOf = (open: Open, playbook: Playbook): Hears => ({
  manager: open.row.node.id,
  name: open.row.node.name,
  version: open.version.number,
  paused: false,
  mayAsk: playbook.reach.mayAsk,
  kinds: playbook.kinds,
  reach: { grants: playbook.reach.grants, limits: playbook.reach.limits },
  open: 0,
  spent: 0,
});

/** The judge, asked about the case once with these words: it passes when it says what the person said it should have. */
async function runOnce(
  c: ConsoleDeps,
  open: Open,
  playbook: Playbook,
  judge: AgentRole | undefined,
  one: JudgeCase,
  version: "now" | "next",
): Promise<CaseRun> {
  const hears = hearsOf(open, playbook);
  const judgement = await askJudge(c.agent.ask, one.item, [hears], [], judge);
  const at = c.clock.now();
  if (judgement._tag === "CouldNot")
    return { case: one.case.id, version, time: at, passed: false, says: `The judge did not answer: ${judgement.why}`, cost: 0 };
  const yes = judgement.judged.verdicts.some((verdict) => verdict.manager === hears.manager && verdict.is);
  const passed = yes === (one.should !== "left");
  const said = yes ? "It said this is one of its kinds of work" : "It said this is none of its kinds of work";
  return {
    case: one.case.id,
    version,
    time: at,
    passed,
    says: `${said}, and a person said it should ${one.should === "left" ? "not be" : "be"}.`,
    cost: 0,
  };
}

const judgeOf = (playbook: Playbook): AgentRole | undefined => playbook.agents.find(({ id }) => id === "judge");

/** What a change to the judge's words is: the playbook as it would be, and both ways run over the same cases. */
export async function tryChange(c: ConsoleDeps, open: Open, change: Change): Promise<Tried> {
  const latest = (await open.store.version()) ?? open.version;
  const current = playbooks.read(latest.files);
  if (current._tag === "Problems")
    return { _tag: "Refused", why: `The playbook does not read: ${current.problems[0]?.says ?? "it has a problem"}` };
  const text = playbooks.lines(current.playbook).find(({ line }) => line === change.line)?.text;
  const was = change.was !== null && text !== undefined && text.trim() === change.was.trim() ? text : change.was;
  const applied = playbooks.apply(latest.files, [{ ...change, was }]);
  if (applied._tag === "Problems") return { _tag: "Refused", why: applied.problems[0]?.says ?? "That change cannot be made." };
  const around = await surroundings(c, wholeOf(await accountsOf(c)));
  const owner = current.playbook.objective.owner;
  const problems = playbooks.check(applied.playbook, { ...around, people: [...around.people, owner] });
  const had = new Set(playbooks.check(current.playbook, { ...around, people: [...around.people, owner] }).map((one) => one.says));
  const added = problems.find((one) => !had.has(one.says));
  if (added !== undefined) return { _tag: "Refused", why: `With that change: ${added.says}` };
  if (!/^agents\/judge\/told$/u.test(change.line))
    return { _tag: "Refused", why: `There are no cases to try a change to ${change.line} on yet; only the judge's words have them.` };
  const cases = await judgeCases(c, open.row.node.id);
  if (cases.length === 0) return { _tag: "Refused", why: "There are no corrections yet to try it on." };
  const nows: CaseRun[] = [];
  const nexts: CaseRun[] = [];
  for (const one of cases) {
    for (let n = 0; n < RUNS; n += 1) {
      nows.push(await runOnce(c, open, current.playbook, judgeOf(current.playbook), one, "now"));
      nexts.push(await runOnce(c, open, applied.playbook, judgeOf(applied.playbook), one, "next"));
    }
  }
  const differ = cases.flatMap(({ case: made }) => {
    const [now, next] = [nows.findLast((run) => run.case === made.id), nexts.findLast((run) => run.case === made.id)];
    return now === undefined || next === undefined || now.passed === next.passed ? [] : [{ case: made.id, now, next }];
  });
  const trial = { of: change.line, changes: [{ ...change, was }], now: trials.score(nows), next: trials.score(nexts), differ, worse: [] };
  return { _tag: "Tried", trial, next: applied.playbook, files: playbooks.write(applied.playbook) };
}
