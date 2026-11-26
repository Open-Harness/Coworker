import { describe, expect, it } from "vitest";
import type { Check, Kind, Step } from "~/modules/playbook/types.ts";
import type { Mandate } from "~/modules/reach/types.ts";
import { works } from "~/modules/work/service.ts";
import type { Evidence, Moved, ThreadRef, ToDo, Work, WorkEvent } from "~/modules/work/types.ts";

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
const [said, tests, merged, fixed, closed] = [
  check("said", "connector"),
  check("tests", "command"),
  check("merged", "connector"),
  check("fixed"),
  check("closed", "connector"),
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
type Rest = WorkEvent extends infer E ? (E extends WorkEvent ? Omit<E, "key" | "at"> : never) : never;
const ev = (key: string, minutes: number, rest: Rest): WorkEvent => ({ key, at: at + minutes * MIN, ...rest }) as WorkEvent;
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
const go = (w: Work, e: WorkEvent, kind: Kind = bug): { work: Work; todo: readonly ToDo[] } => {
  const r = works.move(w, e, kind);
  if (r._tag !== "Moved") throw new Error(`${e.is} (${e.key}) was ${r._tag}${r._tag === "Refused" ? `: ${r.why}` : ""}`);
  return r;
};
const todos = <K extends ToDo["do"]>(r: { readonly todo: readonly ToDo[] }, kind: K) =>
  r.todo.filter((t): t is Extract<ToDo, { do: K }> => t.do === kind);
const plain = (text: string) => {
  expect(text.trim().length).toBeGreaterThan(0);
  expect(text).not.toMatch(/blocked|pending/iu);
};
/** Nothing changed: not seen as news, or news that is the same. */
const nothing = (r: Moved, w: Work) => {
  if (r._tag === "Moved") {
    expect(r.work).toEqual(w);
  } else if (r._tag === "Same") expect(r.work).toEqual(w);
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

/** Done when said, the first thread has reported, and the connector says it was said: now at Build. */
function toBuild(kind: Kind = bug): { work: Work; todo: readonly ToDo[] } {
  let w = go(fresh(kind).work, ev("s1", 1, { is: "started", thread: "t1", agent: "doer" }), kind).work;
  w = go(w, ev("d1", 2, { is: "said done when", checks: [fixed, closed] }), kind).work;
  w = go(w, ev("r1", 3, { is: "reported", thread: "t1", result: "done", says: "Understood.", evidence: [] }), kind).work;
  return go(w, ev("p1", 4, { is: "passed", by: "connector", check: "said" }), kind);
}
/** At Build with its doer working. */
function building(): Work {
  return go(toBuild().work, ev("s2", 5, { is: "started", thread: "t2", agent: "doer" })).work;
}
/** At Build, the doer has reported and a fresh checker is working. */
function checking(): Work {
  let w = go(
    building(),
    ev("r2", 6, { is: "reported", thread: "t2", result: "done", says: "Built.", evidence: [evid("tests", true, doerBy("t2"), 6)] }),
  ).work;
  w = go(w, ev("s3", 7, { is: "started", thread: "t3", agent: "reviewer" })).work;
  return w;
}

type Moves = { work: Work; todo: readonly ToDo[] };
const hears = (r: Moves, token: RegExp) =>
  r.todo.some((t) => (t.do === "start" && token.test(t.brief)) || (t.do === "tell thread" && token.test(t.what)));

describe("work: waiting", () => {
  it("rules:work/unanswered-is-retried-then-asks", () => {
    const first = go(building(), ev("u1", 9, { is: "unanswered", thread: "t2", why: "Token-lost: the box was lost." }));
    expect(first.work.threads.find((t) => t.id === "t2")?.state).toBe("ended");
    expect(todos(first, "ask")).toEqual([]);
    expect(todos(first, "start")).toHaveLength(1);
    expect(todos(first, "start")[0]).toMatchObject({ step: "build", agent: "doer", role: "does" });
    expect(first.work.ended).toBeNull();
    expect(first.work.next?.by).toBeGreaterThan(at + 9 * MIN);
    // The retry dies too: now a person is asked, whoever answers for the work, and nothing is started.
    const retry = go(first.work, ev("s9", 10, { is: "started", thread: "t9", agent: "doer" }));
    const second = go(retry.work, ev("u2", 11, { is: "unanswered", thread: "t9", why: "Token-again: no answer again." }));
    const [ask] = todos(second, "ask");
    expect(todos(second, "ask")).toHaveLength(1);
    expect(ask).toMatchObject({ person: "bo" });
    expect(ask?.question).toMatch(/Token-again/u);
    expect(todos(second, "start")).toEqual([]);
    expect(second.work.waits).toEqual({ ask: ask?.key, person: "bo" });
    expect(second.work.ended).toBeNull();
    // A thread that is not there did not die.
    expect(works.move(building(), ev("u3", 9, { is: "unanswered", thread: "ghost", why: "x" }), bug)._tag).toBe("Refused");
    expect(
      works.move(building(), ev("u5", 9, { is: "reported", thread: "ghost", result: "done", says: "x", evidence: [] }), bug)._tag,
    ).toBe("Refused");
    // A checker that dies is retried as a checker, fresh.
    const check = go(checking(), ev("u4", 9, { is: "unanswered", thread: "t3", why: "Lost." }));
    expect(todos(check, "start")[0]).toMatchObject({ agent: "reviewer", role: "checks", fresh: true });
  });

  it("rules:work/stuck-asks-who-answers-for-it", () => {
    const r = go(
      building(),
      ev("st", 9, { is: "reported", thread: "t2", result: "stuck", says: "Token-stuck: I have no access to staging.", evidence: [] }),
    );
    const [ask] = todos(r, "ask");
    expect(todos(r, "ask")).toHaveLength(1);
    // Whoever answers for the work, not whoever asked for it.
    expect(ask).toMatchObject({ person: "bo" });
    expect(ask?.question).toMatch(/Token-stuck/u);
    expect(ask?.by).toBeGreaterThan(at + 9 * MIN);
    expect(r.work.waits).toEqual({ ask: ask?.key, person: "bo" });
    expect(r.work.next).toMatchObject({ who: { person: "bo" }, by: ask?.by });
    expect(r.work.threads.find((t) => t.id === "t2")?.state).toBe("ended");
    expect(r.work.ended).toBeNull();
    expect(todos(r, "start")).toEqual([]);
  });

  it("rules:work/due-looks-and-says-once-what-it-waits-for", () => {
    const w: Work = { ...building(), next: { what: "the customer's reply on kettle-77", who: "outside", by: at + DAY } };
    // Not yet quiet past its date: nothing.
    nothing(works.move(w, ev("d0", 24 * 60 - 1, { is: "due" }), bug), w);
    const early = works.move(w, ev("d0", 24 * 60 - 1, { is: "due" }), bug);
    expect(early._tag === "Moved" ? todos(early, "say") : []).toEqual([]);
    // Past its date: it says, where it was asked, what it waits for; and looks again later.
    const due = go(w, ev("d1", 24 * 60 + 5, { is: "due" }));
    const [say] = todos(due, "say");
    expect(todos(due, "say")).toHaveLength(1);
    expect(say?.where).toEqual(from);
    expect(say?.text).toMatch(/kettle-77/u);
    plain(say?.text ?? "");
    expect(due.work.chased).toBe(true);
    expect(due.work.next?.by).toBeGreaterThan(at + DAY + 5 * MIN);
    expect(due.work.next?.what).toMatch(/kettle-77/u);
    expect(due.work.ended).toBeNull();
    // Quiet again past the new date: it looks, and does not say it twice.
    const later = go(due.work, ev("d2", 3 * 24 * 60, { is: "due" }));
    expect(todos(later, "say")).toEqual([]);
    expect(later.work.chased).toBe(true);
    expect(later.work.next?.by).toBeGreaterThan(at + 3 * DAY);
    // What it waits for may be a person: said by whom.
    const a = go(building(), ev("a1", 8, { is: "asked", ask: "a1", person: "chidi", by: at + 2 * DAY }));
    const nudge = go(a.work, ev("d3", 2 * 24 * 60 + 10, { is: "due" }));
    expect(todos(nudge, "say")[0]?.text).toMatch(/chidi/u);
    // Asked of someone else is a new wait too, and it says that once as well.
    const other = go(nudge.work, ev("a9", 2 * 24 * 60 + 15, { is: "asked", ask: "a9", person: "pat", by: at + 4 * DAY }));
    expect(other.work.chased).toBe(false);
    const nudgeOther = go(other.work, ev("d9", 4 * 24 * 60 + 5, { is: "due" }));
    expect(todos(nudgeOther, "say")[0]?.text).toMatch(/pat/u);
    // A new wait is a new thing to say: answered, then asked again, it says again, once.
    const answered = go(nudge.work, ev("a2", 2 * 24 * 60 + 20, { is: "answered", ask: "a1", person: "chidi", answer: "Go on." }));
    expect(answered.work.chased).toBe(false);
    const b = go(answered.work, ev("a3", 2 * 24 * 60 + 30, { is: "asked", ask: "a2", person: "chidi", by: at + 3 * DAY }));
    const again = go(b.work, ev("d4", 4 * 24 * 60, { is: "due" }));
    expect(todos(again, "say")).toHaveLength(1);
  });

  it("rules:work/ci-passed-and-failed", () => {
    // CI passes what the step needs: it knows, and goes on.
    const ok = go(building(), ev("c1", 9, { is: "passed", by: "ci", check: "tests" }));
    expect(ok.work.evidence.some((e) => e.check === "tests" && e.met && !("agent" in e.by))).toBe(true);
    expect(ok.work.step).toBe("ship");
    expect(ok.work.next?.by).toBeGreaterThan(at + 9 * MIN);
    // A person who says it passed is named in the evidence.
    const bo = go(building(), ev("c1b", 9, { is: "passed", by: "person", check: "tests", person: "bo" }));
    expect(bo.work.evidence.find((e) => e.check === "tests" && e.met)?.by).toEqual({ person: "bo" });
    // A pass of what a later step needs is kept, and does not skip this one.
    const early = go(building(), ev("c2", 9, { is: "passed", by: "connector", check: "merged" }));
    expect(early.work.step).toBe("build");
    expect(early.work.evidence.some((e) => e.check === "merged")).toBe(true);
    // CI fails: the doer is told what, with the step sent back, once for each time.
    const red = go(building(), ev("c3", 9, { is: "failed", by: "ci", check: "tests", says: "Token-red: 3 failing in login.spec" }));
    expect(red.work.step).toBe("build");
    expect(red.work.sentBack["build"]).toBe(1);
    expect(hears(red, /Token-red/u)).toBe(true);
    expect(red.work.evidence.some((e) => e.check === "tests" && !e.met && e.says.includes("Token-red"))).toBe(true);
    expect(todos(red, "ask")).toEqual([]);
    expect(red.work.ended).toBeNull();
    // A failure is not a pass: CI red does not leave the step even when it was green before.
    expect(red.work.step).not.toBe("ship");
    // Failing past what the step allows asks a person.
    let r = red;
    for (const [i, key] of ["c4", "c5"].entries())
      r = go(r.work, ev(key, 12 + i, { is: "failed", by: "ci", check: "tests", says: `Token-${key}` }));
    expect(todos(r, "ask")).toHaveLength(1);
    expect(todos(r, "ask")[0]).toMatchObject({ person: "ama" });
    expect(r.work.sentBack["build"]).toBe(2);
    // At the last step a failure goes back to Build too, for a person's check or the connector's.
    const atShip = go(ok.work, ev("c6", 10, { is: "failed", by: "connector", check: "merged", says: "Token-conflict: main moved" }));
    expect(atShip.work.step).toBe("build");
    expect(atShip.work.sentBack["ship"]).toBe(1);
    expect(hears(atShip, /Token-conflict/u)).toBe(true);
    // A step that drops on failure ends as dropped, with its reason.
    const dropper: Kind = { ...bug, steps: [understand, build, { ...ship, otherwise: { drop: "The pull request was closed" } }] };
    const toShip = go(
      go(toBuild(dropper).work, ev("s2", 5, { is: "started", thread: "t2", agent: "doer" }), dropper).work,
      ev("c7", 9, { is: "passed", by: "ci", check: "tests" }),
      dropper,
    );
    const dropped = go(toShip.work, ev("c8", 10, { is: "failed", by: "person", check: "merged", says: "Closed." }), dropper);
    expect(dropped.work.ended).toMatchObject({ as: "dropped" });
    expect(dropped.work.ended?.why).toMatch(/pull request was closed/u);
  });
});
