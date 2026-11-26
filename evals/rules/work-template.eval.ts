import { describe, expect, it } from "vitest";
import type { Check, Kind, Step } from "~/modules/playbook/types.ts";
import { works } from "~/modules/work/service.ts";
import type { Evidence, ThreadRef, ToDo, Work, WorkEvent } from "~/modules/work/types.ts";

/* The steps of `docs/templates/repo`, walked: understand, build, check, with a person. The check is a step of its own. */

const at = Date.UTC(2026, 10, 25, 9, 54);
const MIN = 60_000;
const from: ThreadRef = { connector: "github", account: "github", place: "acme/web", id: "412" };
const check = (id: string, by: Check["by"]): Check => ({ id, says: `The ${id} is true`, by });
const step = (id: string, by: Step["by"], leaves: readonly Check[], otherwise: Step["otherwise"]): Step => ({ id, name: id, by, does: `Do ${id}.`, skills: [], leaves, checkedBy: { code: true }, otherwise });
const back = { back: "build", times: 2, then: { ask: "ama" } } as const;
const doneWhen = [check("fixed", "agent"), check("closed", "connector")];
const bug: Kind = {
  id: "bug", name: "Bug", when: "Something is broken", alone: "watch", doneWhen, may: [], limits: {}, look: "1d",
  steps: [
    step("understand", { agent: "doer" }, [check("said", "connector")], { ask: "ama" }),
    step("build", { agent: "doer" }, [check("tests", "command")], back),
    step("check", { agent: "reviewer" }, [check("met", "agent")], back),
    step("review", { manager: true }, [check("merged", "connector")], { drop: "The pull request was closed" }),
  ],
};
type Rest = WorkEvent extends infer E ? (E extends WorkEvent ? Omit<E, "key" | "at"> : never) : never;
interface At {
  readonly work: Work;
  readonly todo: readonly ToDo[];
}
let minute = 0;
function go(was: { readonly work: Work }, ...all: readonly Rest[]): At {
  let now: At = { work: was.work, todo: [] };
  for (const rest of all) {
    minute += 1;
    const r = works.move(now.work, { key: `e${minute}`, at: at + minute * MIN, ...rest } as WorkEvent, bug);
    if (r._tag !== "Moved") throw new Error(`${rest.is} was ${r._tag}${r._tag === "Refused" ? `: ${r.why}` : ""}`);
    now = { work: r.work, todo: [...now.todo, ...r.todo] };
  }
  return now;
}
const evidence = (thread: string, all: Readonly<Record<string, boolean>>): readonly Evidence[] =>
  Object.entries(all).map(([one, met]) => ({ check: one, met, says: met ? "It is." : "It always answers 3.", by: { agent: "reviewer", thread }, at: at + minute * MIN }));
const started = (thread: string, agent: string): Rest => ({ is: "started", thread, agent });
const reported = (thread: string): Rest => ({ is: "reported", thread, result: "done", says: "Done.", evidence: [] });
const passed = (id: string, by: "ci" | "connector"): Rest => ({ is: "passed", by, check: id });
const looked = (thread: string, all: Readonly<Record<string, boolean>>): Rest => ({ is: "checked", thread, says: Object.values(all).includes(false) ? "It always answers 3." : "All true.", evidence: evidence(thread, all) });
const starts = (r: At) => r.todo.filter((t): t is Extract<ToDo, { do: "start" }> => t.do === "start");
const asks = (r: At) => r.todo.filter((t) => t.do === "ask");

function built(): At {
  const taken = works.take({
    id: "w1", manager: "coding", kind: bug, version: 1, title: "It adds", about: "It subtracts.", from, asked: "bo", answers: "ama", at, waits: false,
    mandate: { grants: [], limits: {}, strength: "asked", because: { by: "person", id: "bo" }, version: 1, state: "holds" },
  });
  const building = go(taken, started("t1", "doer"), { is: "said done when", checks: doneWhen }, reported("t1"), passed("said", "connector"), started("t2", "doer"));
  expect(building.work.step).toBe("build");
  return go(building, reported("t2"));
}
const toCheck = (): At => go(built(), passed("tests", "ci"));
const atReview = (): At => go(toCheck(), started("t3", "reviewer"), looked("t3", { met: true, fixed: true }));

describe("the template's steps", () => {
  it("rules:work/a-step-that-only-agents-show-is-a-check-by-someone-fresh", () => {
    expect(built().work.step, "its own word is not enough").toBe("build");
    const check = toCheck();
    expect(check.work.step).toBe("check");
    expect(starts(check)).toMatchObject([{ step: "check", agent: "reviewer", role: "checks", fresh: true }]);
    const on = go(check, started("t3", "reviewer"));
    expect(on.work.threads.find(({ id }) => id === "t3")).toMatchObject({ role: "checks", state: "working" });
    const doer = works.move(on.work, { key: "x", at: at + 90 * MIN, ...looked("t2", { met: true, fixed: true }) } as WorkEvent, bug);
    expect(doer._tag).toBe("Refused");
    const done = go(on, looked("t3", { met: true, fixed: true }));
    expect([done.work.step, done.work.ended, done.work.next?.who, asks(done)]).toEqual(["review", null, "outside", []]);
    expect(done.work.evidence.find(({ check: one, met }) => one === "fixed" && met)?.by).toEqual({ agent: "reviewer", thread: "t3" });
  });

  it("rules:work/sent-back-nothing-that-was-true-before-counts", () => {
    const sent = go(toCheck(), started("t3", "reviewer"), looked("t3", { met: false, fixed: false }));
    expect([sent.work.step, sent.work.sentBack]).toEqual(["build", { check: 1 }]);
    expect(starts(sent)).toMatchObject([{ step: "build", agent: "doer", role: "does" }]);
    expect(starts(sent)[0]?.brief).toContain("It always answers 3.");
    // The tests passed on what was there before. They must pass on what is there now.
    const again = go(sent, started("t4", "doer"), reported("t4"));
    expect(again.work.step).toBe("build");
    const check = go(again, passed("tests", "ci"));
    expect(check.work.step).toBe("check");
    expect(starts(check)).toMatchObject([{ agent: "reviewer", role: "checks", fresh: true }]);
    expect(works.isDone(check.work)).toBe(false);
    const twice = go(check, started("t5", "reviewer"), looked("t5", { met: false, fixed: true }), started("t6", "doer"), reported("t6"), passed("tests", "ci"), started("t7", "reviewer"), looked("t7", { met: false, fixed: false }));
    expect(asks(twice)).toMatchObject([{ person: "ama" }]);
    expect([twice.work.waits?.person, twice.work.ended]).toEqual(["ama", null]);
  });

  it("rules:work/tests-that-fail-send-it-back-before-anyone-looks", () => {
    const failed = go(built(), { is: "failed", by: "ci", check: "tests", says: "tests failed: sh test.sh exited 1" });
    expect([failed.work.step, failed.work.sentBack]).toEqual(["build", { build: 1 }]);
    expect(starts(failed).some(({ agent }) => agent === "reviewer")).toBe(false);
    expect(starts(failed)).toMatchObject([{ agent: "doer", brief: expect.stringContaining("sh test.sh exited 1") }]);
  });

  it("rules:work/with-a-person-it-ends-when-it-is-merged-and-closed-in-either-order", () => {
    const merged = go(atReview(), passed("merged", "connector"));
    expect(merged.work.ended).toBeNull();
    expect(go(merged, passed("closed", "connector")).work.ended).toMatchObject({ as: "done" });
    expect(go(atReview(), passed("closed", "connector"), passed("merged", "connector")).work.ended).toMatchObject({ as: "done" });
    const closed = go(atReview(), { is: "failed", by: "connector", check: "merged", says: "Closed by bo." });
    expect(closed.work.ended).toMatchObject({ as: "dropped", why: "The pull request was closed" });
  });
});
