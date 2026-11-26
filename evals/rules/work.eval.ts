import { describe, expect, it } from "vitest";
import type { Check, Kind, Step } from "~/modules/playbook/types.ts";
import type { Mandate } from "~/modules/reach/types.ts";
import { works } from "~/modules/work/service.ts";
import type { Evidence, ThreadRef, ToDo, Work } from "~/modules/work/types.ts";

const at = Date.UTC(2026, 10, 25, 9, 54);
const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const from: ThreadRef = { connector: "github", account: "github", place: "acme/web", id: "412" };
const mandate: Mandate = {
  grants: [{ account: "github", place: "acme/web", may: { "github.read": "on", "github.comment": "on", "github.merge": "ask" } }],
  limits: { perWork: 10 },
  strength: "asked",
  because: { by: "person", id: "ama" },
  version: 6,
  state: "holds",
};
const check = (id: string, by: Check["by"] = "agent"): Check => ({ id, says: `The ${id} is true`, by });
const [said, tests, merged, fixed, closed, okay] = [
  check("said", "connector"),
  check("tests", "command"),
  check("merged", "connector"),
  check("fixed"),
  check("closed", "connector"),
  check("okay", "person"),
];
const doer = (id: string, name: string, more: Partial<Step> = {}): Step => ({
  id,
  name,
  by: { agent: "doer" },
  does: `Do the ${name} part`,
  skills: [],
  leaves: [],
  checkedBy: { code: true },
  otherwise: { ask: "ama" },
  ...more,
});
const back = { back: "build", times: 2, then: { ask: "ama" } } as const;
const understand = doer("understand", "Understand", { leaves: [said] });
const build = doer("build", "Build", { leaves: [tests], checkedBy: { agent: "reviewer" }, otherwise: back });
const ship = doer("ship", "Ship", { by: { manager: true }, leaves: [merged], otherwise: back });
const bug: Kind = {
  id: "bug",
  name: "Bug",
  when: "Something is broken",
  alone: "watch",
  steps: [understand, build, ship],
  doneWhen: [fixed, closed],
  may: [],
  limits: {},
  look: "1d",
};
const fresh = (kind: Kind = bug, more: { waits?: boolean } = {}) =>
  works.take({
    id: "w1",
    manager: "coding",
    kind,
    version: 6,
    title: "Fix login on issue 412",
    about: "Signing in fails for new users.",
    from,
    asked: "ama",
    answers: "bo",
    mandate,
    at,
    waits: more.waits ?? false,
  });
const todos = <K extends ToDo["do"]>(r: { readonly todo: readonly ToDo[] }, kind: K) =>
  r.todo.filter((t): t is Extract<ToDo, { do: K }> => t.do === kind);
const plain = (text: string) => {
  expect(text.trim().length).toBeGreaterThan(0);
  expect(text).not.toMatch(/blocked|pending/iu);
};
const evid = (
  check: string,
  met: boolean,
  by: Evidence["by"],
  minutes = 5,
  says = `${check} ${met ? "holds" : "does not hold"}.`,
): Evidence => ({
  check,
  met,
  says,
  by,
  at: at + minutes * MIN,
});
const doerBy = (thread: string): Evidence["by"] => ({ agent: "doer", thread });
const reviewer = (thread: string): Evidence["by"] => ({ agent: "reviewer", thread });

const person: Kind = {
  ...bug,
  id: "review",
  steps: [
    understand,
    doer("approve", "Approve", {
      by: { person: "bo" },
      does: "Look at the change and say yes or what is wrong.",
      leaves: [okay],
      otherwise: { drop: "Bo said no" },
    }),
    build,
  ],
};

describe("work: a piece of it", () => {
  it("rules:work/take-makes-open-work", () => {
    const { work: w, todo } = fresh();
    expect(w).toMatchObject({
      id: "w1",
      manager: "coding",
      kind: "bug",
      version: 6,
      title: "Fix login on issue 412",
      about: "Signing in fails for new users.",
      asked: "ama",
      answers: "bo",
      step: "understand",
      doneWhen: null,
      evidence: [],
      sentBack: {},
      threads: [],
      waits: null,
      chased: false,
      cost: 0,
      ended: null,
    });
    expect(w.from).toEqual(from);
    expect(w.mandate).toEqual(mandate);
    expect(w.follows).toEqual([from]);
    // Open work has a next, with a date, from the kind's own look.
    expect(w.next).not.toBeNull();
    expect(w.next?.by).toBe(at + DAY);
    // Its first step starts: the agent of that step, doing it, told what the work is.
    const [start] = todos({ todo }, "start");
    expect(todos({ todo }, "start")).toHaveLength(1);
    expect(start).toMatchObject({ step: "understand", agent: "doer", role: "does" });
    expect(start?.brief).toMatch(/issue 412/u);
    expect(todo.some((t) => t.do === "wake" && t.at === w.next?.by)).toBe(true);
    const keys = todo.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(key.length).toBeGreaterThan(0);
    // The same input is the same result: pure.
    expect(fresh()).toEqual({ work: w, todo });
    // The kind's look sets the date, in minutes, hours and days.
    for (const [look, ms] of [
      ["45m", 45 * MIN],
      ["4h", 240 * MIN],
      ["3d", 3 * DAY],
    ] as const)
      expect(fresh({ ...bug, look }).work.next?.by, look).toBe(at + ms);
    // No room now: it waits for a place, with a date, and starts nothing.
    const waiting = fresh(bug, { waits: true });
    expect(waiting.work.step).toBe("triage");
    expect(works.stepOf(bug, waiting.work)).toBeUndefined();
    expect(waiting.work.next?.by).toBeGreaterThan(at);
    expect(todos(waiting, "start")).toEqual([]);
    expect(waiting.work.ended).toBeNull();
    // A first step that is a person's: an ask to them, with a date, and no agent.
    const asked = fresh(person);
    const [ask] = todos(asked, "ask");
    expect(works.stepOf(person, asked.work)?.id).toBe("understand");
    expect(todos(asked, "start")).toHaveLength(1);
    expect(ask).toBeUndefined();
  });

  it("rules:work/columns-are-the-steps", () => {
    const ids = (kinds: readonly Kind[]) => works.columns(kinds).map((c) => c.id);
    expect(ids([bug])).toEqual(["triage", "understand", "build", "ship", "done"]);
    expect(ids([])).toEqual(["triage", "done"]);
    // Kinds that share a step show it once; the others follow in the order met.
    const other: Kind = { ...bug, id: "docs", steps: [understand, build, ship, doer("publish", "Publish")] };
    expect(ids([bug, other])).toEqual(["triage", "understand", "build", "ship", "publish", "done"]);
    expect(ids([bug, other])).toEqual(ids([other, bug]));
    const apart: Kind = { ...bug, id: "ops", steps: [doer("page", "Page"), doer("fix", "Fix")] };
    expect(ids([bug, apart])).toEqual(["triage", "understand", "build", "ship", "page", "fix", "done"]);
    for (const c of works.columns([bug, apart])) {
      plain(c.name);
      plain(c.tip);
    }
    expect(works.columns([bug])[0]?.name).toMatch(/triage/iu);
    expect(works.columns([bug]).at(-1)?.name).toMatch(/done/iu);
    expect(works.columns([bug])[2]?.name).toBe("Build");
  });

  it("rules:work/step-of-the-work", () => {
    const w = fresh().work;
    expect(works.stepOf(bug, w)).toEqual(understand);
    expect(works.stepOf(bug, { ...w, step: "ship" })).toEqual(ship);
    for (const step of ["triage", "done", "nowhere", ""]) expect(works.stepOf(bug, { ...w, step })).toBeUndefined();
  });

  it("rules:work/is-done-only-with-evidence-from-someone-else", () => {
    const w: Work = { ...fresh().work, doneWhen: [fixed, closed] };
    const threads = [
      { id: "t2", agent: "doer", role: "does", state: "ended" },
      { id: "t3", agent: "reviewer", role: "checks", state: "ended" },
    ] as const;
    const base: Work = { ...w, threads };
    const own = [evid("fixed", true, doerBy("t2")), evid("closed", true, doerBy("t2"))];
    expect(works.isDone({ ...base, evidence: [] })).toBe(false);
    // The one who did it saying so is not evidence, however much of it.
    expect(works.isDone({ ...base, evidence: own })).toBe(false);
    // Nor a new thread of the same agent: it is the same doer.
    expect(works.isDone({ ...base, evidence: [evid("fixed", true, doerBy("t9")), evid("closed", true, doerBy("t9"))] })).toBe(false);
    const other = evid("fixed", true, reviewer("t3"));
    const code = evid("closed", true, { code: true });
    expect(works.isDone({ ...base, evidence: [...own, other] })).toBe(false);
    expect(works.isDone({ ...base, evidence: [...own, other, code] })).toBe(true);
    // A person, or code, counts as someone else. Order does not matter.
    expect(works.isDone({ ...base, evidence: [code, evid("fixed", true, { person: "bo" })] })).toBe(true);
    expect(works.isDone({ ...base, evidence: [other, ...own, code] })).toBe(true);
    // Every one, not most: a check with no evidence, or the wrong check, is not met.
    expect(works.isDone({ ...base, evidence: [other, evid("tests", true, { code: true })] })).toBe(false);
    // Met is what it says: a check that did not hold is not evidence that it did, and the last word of someone else stands.
    expect(works.isDone({ ...base, evidence: [evid("fixed", false, reviewer("t3")), code] })).toBe(false);
    expect(
      works.isDone({ ...base, evidence: [evid("fixed", false, reviewer("t3"), 5), evid("fixed", true, reviewer("t3"), 9), code] }),
    ).toBe(true);
    expect(works.isDone({ ...base, evidence: [other, code, evid("closed", false, { code: true }, 9)] })).toBe(false);
    // The doer's later claim does not undo it, nor a doer's no-claim.
    expect(works.isDone({ ...base, evidence: [other, code, evid("fixed", false, doerBy("t2"), 9)] })).toBe(true);
    // Done when not yet said: nothing is done.
    expect(works.isDone({ ...base, doneWhen: null, evidence: [other, code] })).toBe(false);
  });

  it("rules:work/says-what-it-waits-for-with-names", () => {
    const w = fresh().work;
    const names = { bo: "Bo Larsen", pat: "Pat Reyes", docs: "Docs manager" };
    const next = (who: NonNullable<Work["next"]>["who"]): Work => ({ ...w, next: { what: "x", who, by: at + DAY } });
    expect(works.says(next("itself"), names)).toMatch(/^Working/u);
    expect(works.says(next({ person: "bo" }), names)).toMatch(/Waits for Bo Larsen/u);
    expect(works.says(next("outside"), names)).toMatch(/Waits for the customer/u);
    expect(works.says(next("ci"), names)).toMatch(/Waits for CI/u);
    expect(works.says(next({ manager: "docs" }), names)).toMatch(/Waits for Docs manager/u);
    // A person it asked: the ask, whatever the next says.
    expect(works.says({ ...w, waits: { ask: "a1", person: "pat" }, next: { what: "x", who: { person: "pat" }, by: at } }, names)).toMatch(
      /Waits for Pat Reyes/u,
    );
    // Someone it has no name for is said by what it has, never "undefined".
    const unknown = works.says(next({ person: "zed" }), names);
    expect(unknown).toMatch(/Waits for zed/u);
    expect(unknown).not.toMatch(/undefined/u);
    // Whatever it is, in words that are never "blocked" or "pending".
    const ended = (as: NonNullable<Work["ended"]>["as"]): Work => ({ ...w, next: null, ended: { as, why: "Because.", at } });
    for (const s of [
      next("itself"),
      next("outside"),
      next("ci"),
      next({ person: "bo" }),
      next({ manager: "docs" }),
      ended("done"),
      ended("no"),
      ended("dropped"),
      ended("stopped"),
      ended("handed over"),
    ])
      plain(works.says(s, names));
    expect(works.says(ended("done"), names)).toMatch(/done/iu);
    expect(works.says(ended("stopped"), names)).toMatch(/stop/iu);
    expect(works.says(ended("handed over"), names)).toMatch(/hand/iu);
    expect(works.says(ended("done"), names)).not.toMatch(/^Working|Waits/u);
  });
});
