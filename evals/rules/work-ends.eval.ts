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
const reviewer = (thread: string): Evidence["by"] => ({ agent: "reviewer", thread });

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

const narrower: Mandate = {
  ...mandate,
  grants: [{ account: "github", place: "acme/web", may: { "github.read": "on" } }],
  limits: { perWork: 5 },
};
const wider: Mandate = {
  ...mandate,
  grants: [{ account: "github", place: "acme/web", may: { "github.read": "on", "github.comment": "on", "github.merge": "on" } }],
};
const everyEnd = (): readonly [string, Moves, string][] => {
  const dropper: Kind = {
    ...bug,
    steps: [understand, build, { ...ship, otherwise: { drop: "Token-closed: the pull request was closed" } }],
  };
  let w = go(toBuild(dropper).work, ev("s2", 5, { is: "started", thread: "t2", agent: "doer" }), dropper).work;
  w = go(
    w,
    ev("e0", 6, { is: "reported", thread: "t2", result: "done", says: "Built.", evidence: [evid("tests", true, doerBy("t2"), 6)] }),
    dropper,
  ).work;
  w = go(w, ev("e1", 7, { is: "started", thread: "t3", agent: "reviewer" }), dropper).work;
  const checks = [evid("tests", true, reviewer("t3"), 8), evid("fixed", true, reviewer("t3"), 8)];
  const atShip = go(w, ev("e2", 8, { is: "checked", thread: "t3", says: "True.", evidence: checks }), dropper);
  const merged2 = go(atShip.work, ev("e3", 10, { is: "passed", by: "connector", check: "merged" }), dropper);
  const finished = go(merged2.work, ev("e4", 13, { is: "passed", by: "connector", check: "closed" }), dropper);
  return [
    ["done", finished, "done"],
    [
      "no",
      go(building(), ev("n1", 9, { is: "reported", thread: "t2", result: "no", says: "Token-no: it works as designed.", evidence: [] })),
      "no",
    ],
    ["dropped", go(atShip.work, ev("n2", 10, { is: "failed", by: "person", check: "merged", says: "Closed." }), dropper), "dropped"],
    ["stopped", go(building(), ev("n3", 9, { is: "stopped", person: "ama", why: "Token-stop: hold on." })), "stopped"],
    [
      "finished outside, done",
      go(building(), ev("n4", 9, { is: "finished outside", as: "done", says: "Token-merged: Pat merged it." })),
      "done",
    ],
    [
      "finished outside, no",
      go(building(), ev("n5", 9, { is: "finished outside", as: "no", says: "Token-unmerged: closed unmerged." })),
      "no",
    ],
    ["handed over", go(building(), ev("n6", 9, { is: "handed over", manager: "docs", work: "w-docs-9" })), "handed over"],
  ];
};
type Moves = { work: Work; todo: readonly ToDo[] };

describe("work: ends", () => {
  it("rules:work/finished-outside-is-merged-or-closed-unmerged", () => {
    const merged1 = go(building(), ev("o1", 9, { is: "finished outside", as: "done", says: "Token-merged: Pat merged the pull request." }));
    expect(merged1.work.ended).toMatchObject({ as: "done", at: at + 9 * MIN });
    expect(merged1.work.ended?.why).toMatch(/Token-merged/u);
    expect(todos(merged1, "say")[0]?.text).toMatch(/Token-merged/u);
    // Closed unmerged is a no, and says so; the world decided, so it does not wait for its own evidence.
    const closed1 = go(building(), ev("o2", 9, { is: "finished outside", as: "no", says: "Token-closed: closed without merging." }));
    expect(closed1.work.ended).toMatchObject({ as: "no" });
    expect(todos(closed1, "say")[0]?.text).toMatch(/Token-closed/u);
    expect(works.isDone(merged1.work)).toBe(false);
    // From any step, with threads working or not, and at triage.
    for (const w of [understanding(), toBuild().work, checking(), fresh(bug, { waits: true }).work]) {
      const r = go(w, ev("o3", 9, { is: "finished outside", as: "done", says: "Merged." }));
      expect(r.work.ended?.as).toBe("done");
      expect(r.work.threads.every((t) => t.state === "ended")).toBe(true);
    }
    // After it, nothing else it hears changes it.
    nothing(works.move(merged1.work, ev("o4", 10, { is: "finished outside", as: "no", says: "Closed after all." }), bug), merged1.work);
  });

  it("rules:work/spent-over-a-limit-asks-and-keeps-what-was-made", () => {
    const before = building();
    for (const [over, word] of [
      ["work", /work/iu],
      ["manager", /manager/iu],
      ["workspace", /workspace/iu],
    ] as const) {
      const r = go(before, ev(`s-${over}`, 9, { is: "spent", cost: 11, over }));
      const [ask] = todos(r, "ask");
      expect(todos(r, "ask"), over).toHaveLength(1);
      expect(ask, over).toMatchObject({ person: "bo" });
      expect(ask?.question, over).toMatch(word);
      plain(ask?.question ?? "");
      expect(ask?.by).toBeGreaterThan(at + 9 * MIN);
      expect(r.work.cost).toBe(11);
      expect(r.work.waits).toEqual({ ask: ask?.key, person: "bo" });
      expect(r.work.next).toMatchObject({ who: { person: "bo" }, by: ask?.by });
      // It is not ended: the box, what it made and what it has seen are kept.
      expect(r.work.ended).toBeNull();
      expect(todos(r, "end box")).toEqual([]);
      expect(todos(r, "start")).toEqual([]);
      expect(r.work.evidence).toEqual(before.evidence);
      expect(r.work.step).toBe("build");
    }
    // Spending under it asks nothing.
    const fine = go(before, ev("s1", 9, { is: "spent", cost: 3, over: null }));
    expect(todos(fine, "ask")).toEqual([]);
    expect(fine.work.waits).toBeNull();
    // And its answer, when it comes, lets it carry on.
    const asked = go(before, ev("s2", 9, { is: "spent", cost: 11, over: "work" }));
    const answer = go(
      asked.work,
      ev("s3", 20, { is: "answered", ask: todos(asked, "ask")[0]?.key ?? "", person: "bo", answer: "Raised to 20." }),
    );
    expect(answer.work.waits).toBeNull();
    expect(answer.work.ended).toBeNull();
  });

  it("rules:work/stopped-is-final-only-a-person-opens-it-again", () => {
    const r = go(building(), ev("x1", 9, { is: "stopped", person: "ama", why: "Token-stop: the repo is frozen." }));
    expect(r.work.ended).toMatchObject({ as: "stopped", at: at + 9 * MIN });
    expect(r.work.ended?.why).toMatch(/Token-stop/u);
    expect(r.work.mandate.state).toBe("stopped");
    expect(r.work.mandate.grants).toEqual(mandate.grants);
    expect(todos(r, "say")[0]?.text).toMatch(/Token-stop/u);
    expect(works.says(r.work, {})).toMatch(/stop/iu);
    // Nothing that comes after changes it.
    const later = 10;
    const events: readonly WorkEvent[] = [
      ev("l1", later, { is: "started", thread: "t7", agent: "doer" }),
      ev("l2", later, { is: "reported", thread: "t2", result: "done", says: "Done.", evidence: [evid("tests", true, { code: true })] }),
      ev("l3", later, { is: "passed", by: "ci", check: "tests" }),
      ev("l4", later, { is: "failed", by: "ci", check: "tests", says: "Red." }),
      ev("l5", later, { is: "heard", from, event: "issue_comment", item: "i1" }),
      ev("l6", later, { is: "due" }),
      ev("l7", later, { is: "spent", cost: 50, over: "work" }),
      ev("l8", later, { is: "moved", person: "bo", step: "understand" }),
      ev("l9", later, { is: "asked", ask: "a9", person: "bo", by: at + DAY }),
      ev("l10", later, { is: "finished outside", as: "done", says: "Merged." }),
      ev("l11", later, { is: "stopped", person: "bo", why: "Second." }),
      ev("l12", later, { is: "narrowed", mandate: narrower }),
      ev("l13", later, { is: "said done when", checks: [fixed] }),
      ev("l14", later, { is: "unanswered", thread: "t2", why: "x" }),
      ev("l15", later, { is: "handed over", manager: "docs", work: "w-9" }),
    ];
    for (const e of events) nothing(works.move(r.work, e, bug), r.work);
    // A person opens it again: it is open, has a next with a date, and starts again where it was.
    const open = go(r.work, ev("y1", 30, { is: "opened again", person: "ama", why: "It is unfrozen." }));
    expect(open.work.ended).toBeNull();
    expect(open.work.step).toBe("build");
    expect(open.work.mandate.state).toBe("holds");
    expect(open.work.next?.by).toBeGreaterThan(at + 30 * MIN);
    expect(todos(open, "start")[0]).toMatchObject({ step: "build", agent: "doer", role: "does" });
    expect(open.work.evidence).toEqual(r.work.evidence);
    // Open work is not opened again; and finished work can be, by a person.
    nothing(works.move(open.work, ev("y2", 31, { is: "opened again", person: "ama", why: "x" }), bug), open.work);
    const done = go(building(), ev("y3", 9, { is: "finished outside", as: "done", says: "Merged." }));
    expect(go(done.work, ev("y4", 40, { is: "opened again", person: "bo", why: "Reverted." })).work.ended).toBeNull();
  });

  it("rules:work/moved-by-a-person", () => {
    const r = go(building(), ev("m1", 9, { is: "moved", person: "bo", step: "understand" }));
    expect(r.work.step).toBe("understand");
    expect(todos(r, "start")[0]).toMatchObject({ step: "understand", agent: "doer", role: "does" });
    expect(todos(r, "end threads")).toHaveLength(1);
    expect(r.work.threads.every((t) => t.state === "ended")).toBe(true);
    expect(r.work.doneWhen).toEqual([fixed, closed]);
    expect(r.work.next?.by).toBeGreaterThan(at + 9 * MIN);
    expect(r.work.ended).toBeNull();
    // To a step with no agent it only waits there.
    const ship1 = go(building(), ev("m2", 9, { is: "moved", person: "bo", step: "ship" }));
    expect(ship1.work.step).toBe("ship");
    expect(todos(ship1, "start")).toEqual([]);
    expect(ship1.work.next).not.toBeNull();
    // Where there is no such step it is refused, and says which.
    const none = works.move(building(), ev("m3", 9, { is: "moved", person: "bo", step: "nowhere" }), bug);
    expect(none._tag).toBe("Refused");
    expect(none._tag === "Refused" && none.why).toMatch(/nowhere/u);
    // Where it already is, nothing happens.
    nothing(works.move(building(), ev("m4", 9, { is: "moved", person: "bo", step: "build" }), bug), building());
  });

  it("rules:work/narrowed-tells-the-threads-and-never-grows", () => {
    const w = building();
    const r = go(w, ev("n1", 9, { is: "narrowed", mandate: narrower }));
    expect(r.work.mandate).toEqual(narrower);
    // Every thread that is working is told, once each; one that ended is not.
    const told = todos(r, "tell thread");
    expect(told.map((t) => t.thread)).toEqual(["t2"]);
    for (const t of told) plain(t.what);
    expect(new Set(r.todo.map((t) => t.key)).size).toBe(r.todo.length);
    const more = go(w, ev("n2", 9, { is: "started", thread: "t5", agent: "reviewer" }));
    expect(
      todos(go(more.work, ev("n3", 10, { is: "narrowed", mandate: narrower })), "tell thread")
        .map((t) => t.thread)
        .sort(),
    ).toEqual(["t2", "t5"]);
    // Taken back above: nothing left of it.
    const gone: Mandate = { ...mandate, grants: [], limits: {}, state: "taken back" };
    expect(go(w, ev("n4", 9, { is: "narrowed", mandate: gone })).work.mandate.state).toBe("taken back");
    // Wider is refused, at once and after it was narrowed: it never grows back.
    for (const [state, wide] of [
      [w, wider],
      [w, widerLimit()],
      [r.work, mandate],
      [r.work, wider],
    ] as const) {
      const refused = works.move(state, ev("n5", 10, { is: "narrowed", mandate: wide }), bug);
      expect(refused._tag).toBe("Refused");
      plain(refused._tag === "Refused" ? refused.why : "");
    }
    expect(r.work.mandate).toEqual(narrower);
    // The same mandate is nothing new.
    nothing(works.move(w, ev("n6", 9, { is: "narrowed", mandate }), bug), w);
  });

  it("rules:work/handed-over", () => {
    const r = go(building(), ev("h1", 9, { is: "handed over", manager: "docs", work: "w-docs-9" }));
    expect(r.work.ended).toMatchObject({ as: "handed over", at: at + 9 * MIN });
    expect(r.work.ended?.why).toMatch(/docs/u);
    expect(r.work.ended?.why).toMatch(/w-docs-9/u);
    expect(r.work.next).toBeNull();
    expect(todos(r, "end threads")).toHaveLength(1);
    expect(todos(r, "say")[0]?.where).toEqual(from);
    expect(todos(r, "say")[0]?.text).toMatch(/docs/u);
    expect(works.says(r.work, { docs: "Docs manager" })).toMatch(/hand/iu);
    // It is not handed twice, nor after it ended.
    nothing(works.move(r.work, ev("h2", 10, { is: "handed over", manager: "support", work: "w-sup-1" }), bug), r.work);
  });

  it("rules:work/ended-ends-the-threads-the-box-and-says-where-it-was-asked", () => {
    const ends = everyEnd();
    expect(ends.map(([, , as]) => as)).toEqual(["done", "no", "dropped", "stopped", "done", "no", "handed over"]);
    for (const [name, r, as] of ends) {
      expect(r.work.ended?.as, name).toBe(as);
      plain(r.work.ended?.why ?? "");
      expect(r.work.next, name).toBeNull();
      expect(r.work.waits, name).toBeNull();
      expect(
        r.work.threads.every((t) => t.state === "ended"),
        name,
      ).toBe(true);
      expect(todos(r, "end threads"), name).toHaveLength(1);
      expect(todos(r, "end box"), name).toHaveLength(1);
      const says = todos(r, "say");
      expect(says, name).toHaveLength(1);
      // Where it was asked, in words about this work and why it ended.
      expect(says[0]?.where, name).toEqual(from);
      plain(says[0]?.text ?? "");
      const token = /Token-\w+/u.exec(r.work.ended?.why ?? "")?.[0];
      if (token) expect(says[0]?.text, name).toContain(token);
      const keys = r.todo.map((t) => t.key);
      expect(new Set(keys).size, name).toBe(keys.length);
      plain(works.says(r.work, {}));
    }
    // What it was asked is kept: the answer goes back to where the question came from, not to where it is working.
    const other = { ...from, id: "999" };
    const elsewhere = go({ ...building(), from: other }, ev("z1", 9, { is: "finished outside", as: "done", says: "Merged." }));
    expect(todos(elsewhere, "say")[0]?.where).toEqual(other);
  });
});

function widerLimit(): Mandate {
  return { ...mandate, limits: { perWork: 50 } };
}
