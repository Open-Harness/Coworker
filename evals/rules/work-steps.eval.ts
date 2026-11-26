import { describe, expect, it } from "vitest";
import type { Check, Kind, Step } from "~/modules/playbook/types.ts";
import type { Mandate } from "~/modules/reach/types.ts";
import { works } from "~/modules/work/service.ts";
import type { Evidence, Moved, ThreadRef, ToDo, Work, WorkEvent } from "~/modules/work/types.ts";

const at = Date.UTC(2026, 10, 25, 9, 54);
const MIN = 60_000;
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
const approve = doer("approve", "Approve", {
  by: { person: "bo" },
  does: "Look at the change and say yes or what is wrong.",
  leaves: [okay],
  otherwise: { drop: "Bo said no" },
});
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
const reviewer = (thread: string): Evidence["by"] => ({ agent: "reviewer", thread });

const person: Kind = { ...bug, id: "review", steps: [understand, approve, build] };
/** Step 1 with a thread working. */
function understanding(): Work {
  return go(fresh().work, ev("s1", 1, { is: "started", thread: "t1", agent: "doer" })).work;
}
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

/** Send it back to Build `n` times, each time with a fresh doer and a fresh checker, and return it after the last one. */
function sentBack(w0: Work, n: number, says = "Tests fail."): Moves {
  let r: Moves = { work: w0, todo: [] };
  for (let i = 0; i < n; i += 1) {
    const t = 10 + i * 4;
    r = go(
      r.work,
      ev(`f${i}`, t, {
        is: "checked",
        thread: i === 0 ? "t3" : `c${i}`,
        says,
        evidence: [evid("tests", false, reviewer(i === 0 ? "t3" : `c${i}`), t)],
      }),
    );
    if (i < n - 1) {
      r = go(r.work, ev(`sd${i}`, t + 1, { is: "started", thread: `d${i}`, agent: "doer" }));
      r = go(r.work, ev(`rd${i}`, t + 2, { is: "reported", thread: `d${i}`, result: "done", says: "Fixed.", evidence: [] }));
      r = go(r.work, ev(`sc${i}`, t + 3, { is: "started", thread: `c${i + 1}`, agent: "reviewer" }));
    }
  }
  return r;
}
type Moves = { work: Work; todo: readonly ToDo[] };
const hears = (r: Moves, token: RegExp) =>
  r.todo.some((t) => (t.do === "start" && token.test(t.brief)) || (t.do === "tell thread" && token.test(t.what)));

describe("work: steps", () => {
  it("rules:work/done-when-is-written-before-building", () => {
    const w = understanding();
    expect(w.doneWhen).toBeNull();
    // Nothing is reported done, and nobody moves it on, while done when is not said.
    const early = works.move(w, ev("r1", 3, { is: "reported", thread: "t1", result: "done", says: "Done.", evidence: [] }), bug);
    expect(early._tag).toBe("Refused");
    expect(early._tag === "Refused" && early.why).toMatch(/done.?when/iu);
    const moved = works.move(w, ev("m1", 3, { is: "moved", person: "bo", step: "build" }), bug);
    expect(moved._tag).toBe("Refused");
    expect(moved._tag === "Refused" && moved.why).toMatch(/done.?when/iu);
    // What the connector says goes on record, but it does not leave the step.
    const seen = go(w, ev("p1", 3, { is: "passed", by: "connector", check: "said" }));
    expect(seen.work.step).toBe("understand");
    expect(todos(seen, "start")).toEqual([]);
    // Nothing can be said to be done with no check at all.
    expect(works.move(w, ev("d0", 3, { is: "said done when", checks: [] }), bug)._tag).toBe("Refused");
    // Said: kept, and said where it was asked, with every check in words.
    const said1 = go(seen.work, ev("d1", 4, { is: "said done when", checks: [fixed, closed] }));
    expect(said1.work.doneWhen).toEqual([fixed, closed]);
    const [say] = todos(said1, "say");
    expect(todos(said1, "say")).toHaveLength(1);
    expect(say?.where).toEqual(from);
    plain(say?.text ?? "");
    for (const c of [fixed, closed]) expect(say?.text).toContain(c.says);
    // Now it can be reported, and goes on to Build, with its agent started.
    const next = toBuild();
    expect(next.work.step).toBe("build");
    expect(todos(next, "start")[0]).toMatchObject({ step: "build", agent: "doer", role: "does" });
    expect(next.work.doneWhen).toEqual([fixed, closed]);
    // A person may move it back, whenever; forward it needs done when too.
    const spoken = go(toBuild().work, ev("m2", 9, { is: "moved", person: "bo", step: "understand" }));
    expect(spoken.work.step).toBe("understand");
  });

  it("rules:work/evidence-is-never-from-who-did-it", () => {
    // The doer reports with its own evidence of everything: it is kept, and it does not let the step go.
    const r = go(
      building(),
      ev("r2", 6, {
        is: "reported",
        thread: "t2",
        result: "done",
        says: "Built.",
        evidence: [evid("tests", true, doerBy("t2"), 6), evid("fixed", true, doerBy("t2"), 6)],
      }),
    );
    expect(r.work.step).toBe("build");
    expect(r.work.evidence.some((e) => e.check === "fixed")).toBe(true);
    expect(works.isDone(r.work)).toBe(false);
    // Someone who did not do it is started, fresh, to look.
    expect(todos(r, "start")).toHaveLength(1);
    expect(todos(r, "start")[0]).toMatchObject({ step: "build", agent: "reviewer", role: "checks", fresh: true });
    plain(todos(r, "start")[0]?.brief ?? "");
    // That thread is a checker, not a doer.
    const started = go(r.work, ev("s3", 7, { is: "started", thread: "t3", agent: "reviewer" }));
    expect(started.work.threads.find((t) => t.id === "t3")).toMatchObject({ role: "checks", state: "working" });
    // A thread that did the work cannot check it, nor can one that is not there.
    for (const thread of ["t2", "ghost"]) {
      const said = works.move(
        started.work,
        ev("c0", 8, { is: "checked", thread, says: "Fine.", evidence: [evid("tests", true, doerBy(thread), 8)] }),
        bug,
      );
      expect(said._tag, thread).toBe("Refused");
      expect(said._tag === "Refused" && said.why).toMatch(new RegExp(thread, "u"));
    }
    // The checker's evidence is what lets it go on.
    const ok = go(
      started.work,
      ev("c1", 9, {
        is: "checked",
        thread: "t3",
        says: "All true.",
        evidence: [evid("tests", true, reviewer("t3"), 9), evid("fixed", true, reviewer("t3"), 9)],
      }),
    );
    expect(ok.work.step).toBe("ship");
    // At the end, done only when the checks of done when are met by someone else.
    const merged1 = go(ok.work, ev("p2", 10, { is: "passed", by: "connector", check: "merged" }));
    expect(merged1.work.ended).toBeNull();
    const done = go(merged1.work, ev("p3", 11, { is: "passed", by: "connector", check: "closed" }));
    expect(done.work.ended).toMatchObject({ as: "done" });
    expect(works.isDone(done.work)).toBe(true);
    // Had only the doer said "fixed", it would not end, however much CI and the connector say.
    const only = go(
      go(
        go(
          building(),
          ev("q1", 6, { is: "reported", thread: "t2", result: "done", says: "Built.", evidence: [evid("fixed", true, doerBy("t2"), 6)] }),
        ).work,
        ev("q2", 7, { is: "passed", by: "ci", check: "tests" }),
      ).work,
      ev("q3", 8, { is: "passed", by: "connector", check: "merged" }),
    );
    const last = go(only.work, ev("q4", 9, { is: "passed", by: "connector", check: "closed" }));
    expect(last.work.step).toBe("ship");
    expect(last.work.ended).toBeNull();
    expect(works.isDone(last.work)).toBe(false);
    expect(last.work.next).not.toBeNull();
  });

  it("rules:work/sent-back-twice-asks-a-person", () => {
    const once = sentBack(checking(), 1, "Token-one fails.");
    expect(once.work).toMatchObject({ step: "build", ended: null, waits: null });
    expect(once.work.sentBack["build"]).toBe(1);
    expect(hears(once, /Token-one/u)).toBe(true);
    expect(todos(once, "ask")).toEqual([]);
    expect(once.work.evidence.some((e) => e.check === "tests" && !e.met)).toBe(true);
    const twice = sentBack(checking(), 2, "Token-two fails.");
    expect(twice.work.sentBack["build"]).toBe(2);
    expect(twice.work.step).toBe("build");
    expect(todos(twice, "ask")).toEqual([]);
    expect(hears(twice, /Token-two/u)).toBe(true);
    // It came back a third time after being sent back twice: a person is asked, with what was wrong.
    const third = sentBack(checking(), 3, "Token-three fails.");
    const [ask] = todos(third, "ask");
    expect(todos(third, "ask")).toHaveLength(1);
    expect(ask).toMatchObject({ person: "ama" });
    expect(["decide", "do", "review", "approve"]).toContain(ask?.need);
    expect(ask?.question).toMatch(/Token-three/u);
    expect(ask?.by).toBeGreaterThan(at + 22 * MIN);
    expect(todos(third, "start")).toEqual([]);
    expect(third.work.waits).toEqual({ ask: ask?.key, person: "ama" });
    expect(third.work.next).toMatchObject({ who: { person: "ama" }, by: ask?.by });
    expect(third.work.sentBack["build"]).toBe(2);
    expect(third.work.ended).toBeNull();
    // How many is the step's own word: one time back, then the ask.
    const brief: Kind = { ...bug, steps: [understand, { ...build, otherwise: { back: "build", times: 1, then: { ask: "chidi" } } }, ship] };
    const prep = (kind: Kind) =>
      go(
        go(toBuild(kind).work, ev("s2", 5, { is: "started", thread: "t2", agent: "doer" }), kind).work,
        ev("r2", 6, { is: "reported", thread: "t2", result: "done", says: "B.", evidence: [] }),
        kind,
      );
    const check1 = go(
      go(prep(brief).work, ev("s3", 7, { is: "started", thread: "t3", agent: "reviewer" }), brief).work,
      ev("c1", 8, { is: "checked", thread: "t3", says: "No.", evidence: [evid("tests", false, reviewer("t3"))] }),
      brief,
    );
    expect(check1.work.sentBack["build"]).toBe(1);
    expect(todos(check1, "ask")).toEqual([]);
    const next = go(
      go(
        go(check1.work, ev("s4", 9, { is: "started", thread: "d1", agent: "doer" }), brief).work,
        ev("r3", 10, { is: "reported", thread: "d1", result: "done", says: "B.", evidence: [] }),
        brief,
      ).work,
      ev("s5", 11, { is: "started", thread: "c2", agent: "reviewer" }),
      brief,
    );
    const check2 = go(
      next.work,
      ev("c2", 12, { is: "checked", thread: "c2", says: "Still no.", evidence: [evid("tests", false, reviewer("c2"))] }),
      brief,
    );
    expect(todos(check2, "ask")[0]).toMatchObject({ person: "chidi" });
    // And when it is answered, it carries on at the step, told what the person said.
    const answered = go(
      third.work,
      ev("an", 40, { is: "answered", ask: ask?.key ?? "", person: "ama", answer: "Token-answer: skip the flaky one." }),
    );
    expect(answered.work.waits).toBeNull();
    expect(answered.work.step).toBe("build");
    expect(hears(answered, /Token-answer/u)).toBe(true);
  });

  it("rules:work/a-person-step-asks-and-carries-on", () => {
    const start = go(fresh(person).work, ev("d1", 1, { is: "said done when", checks: [fixed, closed] }), person);
    const into = go(start.work, ev("p1", 2, { is: "passed", by: "connector", check: "said" }), person);
    expect(into.work.step).toBe("approve");
    const [ask] = todos(into, "ask");
    expect(todos(into, "ask")).toHaveLength(1);
    expect(todos(into, "start")).toEqual([]);
    expect(ask).toMatchObject({ person: "bo", need: "do" });
    expect(ask?.by).toBeGreaterThan(at + 2 * MIN);
    plain(ask?.question ?? "");
    expect(ask?.question).toMatch(/Approve|change/u);
    expect(into.work.waits).toEqual({ ask: ask?.key, person: "bo" });
    expect(into.work.next).toMatchObject({ who: { person: "bo" }, by: ask?.by });
    expect(works.says(into.work, { bo: "Bo Larsen" })).toMatch(/Waits for Bo Larsen/u);
    expect(into.work.ended).toBeNull();
    // Another ask is not this one.
    const wrong = works.move(into.work, ev("an0", 5, { is: "answered", ask: "someone-elses", person: "bo", answer: "Yes." }), person);
    expect(wrong._tag).toBe("Refused");
    expect(into.work.waits?.ask).toBe(ask?.key);
    // Their answer is the step done: it carries on to the next step, whose agent is started.
    const yes = go(into.work, ev("an1", 6, { is: "answered", ask: ask?.key ?? "", person: "bo", answer: "Looks right." }), person);
    expect(yes.work.waits).toBeNull();
    expect(yes.work.chased).toBe(false);
    expect(yes.work.step).toBe("build");
    expect(todos(yes, "start")[0]).toMatchObject({ step: "build", agent: "doer", role: "does" });
    expect(yes.work.next?.who).toBe("itself");
    // Said twice, nothing more happens.
    const again = works.move(yes.work, ev("an1", 6, { is: "answered", ask: ask?.key ?? "", person: "bo", answer: "Looks right." }), person);
    nothing(again, yes.work);
    if (again._tag === "Moved") expect(todos(again, "start")).toEqual(todos(yes, "start"));
  });
});
