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

type Moves = { work: Work; todo: readonly ToDo[] };
const stopped = (): Work => go(building(), ev("x1", 8, { is: "stopped", person: "ama", why: "Not now, the repo is frozen." })).work;
const asking = (): Work => go(building(), ev("a1", 8, { is: "asked", ask: "a1", person: "chidi", by: at + 3 * DAY })).work;
const narrower: Mandate = {
  ...mandate,
  grants: [{ account: "github", place: "acme/web", may: { "github.read": "on" } }],
  limits: { perWork: 5 },
};

describe("work: events", () => {
  it("rules:work/every-event-has-its-effect", () => {
    const cases: readonly [string, Work, WorkEvent, (r: Moves, before: Work) => void][] = [
      [
        "started",
        toBuild().work,
        ev("e1", 9, { is: "started", thread: "t2", agent: "doer" }),
        (r) => {
          expect(r.work.threads).toEqual([
            expect.objectContaining({ id: "t1", state: "ended" }),
            { id: "t2", agent: "doer", role: "does", state: "working" },
          ]);
        },
      ],
      [
        "said done when",
        understanding(),
        ev("e1", 9, { is: "said done when", checks: [fixed, closed] }),
        (r) => {
          expect(r.work.doneWhen).toEqual([fixed, closed]);
          expect(todos(r, "say")[0]?.where).toEqual(from);
        },
      ],
      [
        "reported done",
        building(),
        ev("e1", 9, { is: "reported", thread: "t2", result: "done", says: "Built.", evidence: [evid("tests", true, doerBy("t2"))] }),
        (r) => {
          expect(r.work.threads.find((t) => t.id === "t2")?.state).toBe("ended");
          expect(r.work.evidence.filter((e) => e.check === "tests")).toHaveLength(1);
          expect(todos(r, "start")[0]).toMatchObject({ step: "build", agent: "reviewer", role: "checks", fresh: true });
        },
      ],
      [
        "reported no",
        building(),
        ev("e1", 9, { is: "reported", thread: "t2", result: "no", says: "It is working as designed.", evidence: [] }),
        (r) => {
          expect(r.work.ended).toMatchObject({ as: "no", at: at + 9 * MIN });
          expect(r.work.ended?.why).toMatch(/working as designed/u);
        },
      ],
      [
        "reported stuck",
        building(),
        ev("e1", 9, { is: "reported", thread: "t2", result: "stuck", says: "No access to staging.", evidence: [] }),
        (r) => {
          expect(todos(r, "ask")[0]).toMatchObject({ person: "bo" });
          expect(todos(r, "ask")[0]?.question).toMatch(/staging/u);
          expect(r.work.ended).toBeNull();
        },
      ],
      [
        "unanswered",
        building(),
        ev("e1", 9, { is: "unanswered", thread: "t2", why: "The box was lost." }),
        (r) => {
          expect(r.work.threads.find((t) => t.id === "t2")?.state).toBe("ended");
          expect(todos(r, "start")[0]).toMatchObject({ step: "build", agent: "doer", role: "does" });
        },
      ],
      [
        "checked",
        checking(),
        ev("e1", 9, {
          is: "checked",
          thread: "t3",
          says: "All true.",
          evidence: [evid("tests", true, reviewer("t3")), evid("fixed", true, reviewer("t3"))],
        }),
        (r) => {
          expect(r.work.step).toBe("ship");
          expect(r.work.evidence.filter((e) => "agent" in e.by && e.by.agent === "reviewer")).toHaveLength(2);
          expect(r.work.threads.find((t) => t.id === "t3")?.state).toBe("ended");
        },
      ],
      [
        "heard",
        building(),
        ev("e1", 9, { is: "heard", from, event: "issue_comment", item: "item-77" }),
        (r) => {
          const [tell] = todos(r, "tell thread");
          expect(tell).toMatchObject({ thread: "t2" });
          expect(tell?.what).toMatch(/item-77/u);
        },
      ],
      [
        "follows",
        toBuild().work,
        ev("e1", 9, { is: "follows", thread: { ...from, id: "413" } }),
        (r) => {
          expect(r.work.follows).toEqual([from, { ...from, id: "413" }]);
        },
      ],
      [
        "asked",
        building(),
        ev("e1", 9, { is: "asked", ask: "a1", person: "chidi", by: at + 3 * DAY }),
        (r) => {
          expect(r.work.waits).toEqual({ ask: "a1", person: "chidi" });
          expect(r.work.next).toMatchObject({ who: { person: "chidi" }, by: at + 3 * DAY });
        },
      ],
      [
        "answered",
        asking(),
        ev("e1", 9, { is: "answered", ask: "a1", person: "chidi", answer: "Use staging-2." }),
        (r) => {
          expect(r.work.waits).toBeNull();
          expect(r.work.next).not.toBeNull();
          expect(
            r.todo.some((t) => (t.do === "tell thread" && /staging-2/u.test(t.what)) || (t.do === "start" && /staging-2/u.test(t.brief))),
          ).toBe(true);
        },
      ],
      [
        "passed",
        building(),
        ev("e1", 9, { is: "passed", by: "ci", check: "tests" }),
        (r) => {
          expect(r.work.evidence.some((e) => e.check === "tests" && e.met)).toBe(true);
          expect(r.work.step).toBe("ship");
        },
      ],
      [
        "failed",
        building(),
        ev("e1", 9, { is: "failed", by: "ci", check: "tests", says: "Three tests fail in login.spec." }),
        (r) => {
          expect(r.work.evidence.some((e) => e.check === "tests" && !e.met)).toBe(true);
          expect(r.work.step).toBe("build");
          expect(r.work.sentBack["build"]).toBe(1);
        },
      ],
      [
        "finished outside",
        building(),
        ev("e1", 9, { is: "finished outside", as: "done", says: "Merged by Pat." }),
        (r) => {
          expect(r.work.ended).toMatchObject({ as: "done" });
        },
      ],
      [
        "due",
        building(),
        ev("e1", 5 + 24 * 60 + 1, { is: "due" }),
        (r, before) => {
          expect(r.work.chased).toBe(true);
          expect(r.work.next?.by).toBeGreaterThan((before.next?.by ?? 0) + 1);
          expect(todos(r, "say")).toHaveLength(1);
        },
      ],
      [
        "spent",
        building(),
        ev("e1", 9, { is: "spent", cost: 2.5, over: null }),
        (r) => {
          expect(r.work.cost).toBe(2.5);
          expect(r.work.ended).toBeNull();
        },
      ],
      [
        "moved",
        building(),
        ev("e1", 9, { is: "moved", person: "bo", step: "understand" }),
        (r) => {
          expect(r.work.step).toBe("understand");
          expect(todos(r, "start")[0]).toMatchObject({ step: "understand", agent: "doer" });
        },
      ],
      [
        "stopped",
        building(),
        ev("e1", 9, { is: "stopped", person: "ama", why: "Hold on." }),
        (r) => {
          expect(r.work.ended).toMatchObject({ as: "stopped" });
          expect(r.work.mandate.state).toBe("stopped");
        },
      ],
      [
        "opened again",
        stopped(),
        ev("e1", 9, { is: "opened again", person: "ama", why: "It is unfrozen." }),
        (r) => {
          expect(r.work.ended).toBeNull();
          expect(r.work.next?.by).toBeGreaterThan(at + 9 * MIN);
        },
      ],
      [
        "narrowed",
        building(),
        ev("e1", 9, { is: "narrowed", mandate: narrower }),
        (r) => {
          expect(r.work.mandate).toEqual(narrower);
        },
      ],
      [
        "handed over",
        building(),
        ev("e1", 9, { is: "handed over", manager: "docs", work: "w-docs-9" }),
        (r) => {
          expect(r.work.ended).toMatchObject({ as: "handed over" });
        },
      ],
    ];
    expect(new Set(cases.map(([name]) => name)).size).toBe(21);
    for (const [name, before, event, effect] of cases) {
      const frozen = structuredClone(before);
      const r = go(before, event);
      expect(before, `${name} changed what it was given`).toEqual(frozen);
      effect(r, before);
      const keys = r.todo.map((t) => t.key);
      expect(new Set(keys).size, `${name} keys`).toBe(keys.length);
      if (r.work.ended === null) {
        expect(r.work.next, name).not.toBeNull();
        expect(Number.isFinite(r.work.next?.by), name).toBe(true);
      }
    }
  });

  it("rules:work/the-same-key-twice-changes-nothing", () => {
    const again = (before: Work, event: WorkEvent) => {
      const first = go(before, event);
      const second = works.move(first.work, event, bug);
      nothing(second, first.work);
      if (second._tag === "Moved") for (const t of second.todo) expect(first.todo.map((x) => x.key)).toContain(t.key);
      // And from the start again it is the same: pure, so the same keys for the same events.
      expect(go(before, event)).toEqual(first);
      return first.work;
    };
    // Evidence once, and the step moved once.
    expect(
      again(building(), ev("e1", 9, { is: "passed", by: "ci", check: "tests" })).evidence.filter((e) => e.check === "tests"),
    ).toHaveLength(1);
    // A failure counted once: it is one thing that went wrong, not two.
    expect(again(building(), ev("e1", 9, { is: "failed", by: "ci", check: "tests", says: "Red." })).sentBack["build"]).toBe(1);
    expect(
      again(checking(), ev("e1", 9, { is: "checked", thread: "t3", says: "No.", evidence: [evid("tests", false, reviewer("t3"))] }))
        .sentBack["build"],
    ).toBe(1);
    // Threads, follows, asks and answers once.
    expect(
      again(toBuild().work, ev("e1", 9, { is: "started", thread: "t2", agent: "doer" })).threads.filter((t) => t.id === "t2"),
    ).toHaveLength(1);
    expect(again(toBuild().work, ev("e1", 9, { is: "follows", thread: { ...from, id: "413" } })).follows).toHaveLength(2);
    expect(again(building(), ev("e1", 9, { is: "asked", ask: "a1", person: "chidi", by: at + DAY })).waits).toEqual({
      ask: "a1",
      person: "chidi",
    });
    again(asking(), ev("e1", 9, { is: "answered", ask: "a1", person: "chidi", answer: "Yes." }));
    again(
      building(),
      ev("e1", 9, { is: "reported", thread: "t2", result: "done", says: "Built.", evidence: [evid("tests", true, doerBy("t2"))] }),
    );
    again(building(), ev("e1", 9, { is: "unanswered", thread: "t2", why: "Died." }));
    again(building(), ev("e1", 9, { is: "heard", from, event: "issue_comment", item: "i-9" }));
    again(building(), ev("e1", 9, { is: "narrowed", mandate: narrower }));
    again(building(), ev("e1", 9, { is: "moved", person: "bo", step: "understand" }));
    again(building(), ev("e1", 9, { is: "finished outside", as: "no", says: "Closed." }));
    again(building(), ev("e1", 9, { is: "handed over", manager: "docs", work: "w-9" }));
    expect(again(building(), ev("e1", 9, { is: "spent", cost: 4, over: null })).cost).toBe(4);
    // A limit reached asks once.
    const over = go(building(), ev("e1", 9, { is: "spent", cost: 11, over: "work" }));
    expect(todos(over, "ask")).toHaveLength(1);
    const twice = works.move(over.work, ev("e1", 9, { is: "spent", cost: 11, over: "work" }), bug);
    expect(twice._tag === "Moved" ? todos(twice, "ask") : []).toEqual([]);
    // A stop, once: the reason is the first.
    const first = again(building(), ev("e1", 9, { is: "stopped", person: "ama", why: "First reason." }));
    const late = works.move(first, ev("e2", 10, { is: "stopped", person: "bo", why: "Second reason." }), bug);
    nothing(late, first);
    // Done when said again, the same, is not news.
    again(understanding(), ev("e1", 9, { is: "said done when", checks: [fixed, closed] }));
    // A due that is seen again does not say twice.
    const due = go(building(), ev("e1", 5 + 24 * 60 + 1, { is: "due" }));
    const dueAgain = works.move(due.work, ev("e1", 5 + 24 * 60 + 1, { is: "due" }), bug);
    expect(dueAgain._tag === "Moved" ? todos(dueAgain, "say") : []).toEqual([]);
  });

  it("rules:work/what-is-heard-on-its-threads-goes-to-the-work", () => {
    const heard = (key: string, id = from.id) =>
      ev(key, 9, { is: "heard", from: { ...from, id }, event: "issue_comment", item: "item-77" });
    // Every thread that is working is told, once each, with no new decision.
    const two = go(building(), ev("h0", 8, { is: "started", thread: "t5", agent: "reviewer" })).work;
    const told = todos(go(two, heard("h1")), "tell thread");
    expect(told.map((t) => t.thread).sort()).toEqual(["t2", "t5"]);
    for (const t of told) expect(t.what).toMatch(/item-77/u);
    // Another conversation is not this work's: it is refused, and says which.
    const other = works.move(building(), heard("h2", "999"), bug);
    expect(other._tag).toBe("Refused");
    expect(other._tag === "Refused" && other.why).toMatch(/999/u);
    // Nobody is working and it waits for the customer: what they said wakes its agent, and it is not waiting any more.
    const quiet: Work = {
      ...toBuild().work,
      next: { what: "the customer's reply on kettle-77", who: "outside", by: at + DAY },
      chased: true,
    };
    const woke = go(quiet, heard("h3"));
    expect(todos(woke, "start")[0]).toMatchObject({ step: "build", agent: "doer", role: "does" });
    expect(todos(woke, "start")[0]?.brief).toMatch(/item-77/u);
    expect(woke.work.next?.who).toBe("itself");
    expect(woke.work.chased).toBe(false);
    // While a person has the ask, what is heard does not answer it.
    expect(go(asking(), heard("h4")).work.waits).toEqual({ ask: "a1", person: "chidi" });
  });
});
