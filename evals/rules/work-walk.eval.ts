import { describe, expect, it } from "vitest";
import type { Check, Kind, Step } from "~/modules/playbook/types.ts";
import type { Mandate } from "~/modules/reach/types.ts";
import { works } from "~/modules/work/service.ts";
import type { Evidence, Moved, ThreadRef, Work, WorkEvent } from "~/modules/work/types.ts";

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
const approve = doer("approve", "Approve", {
  by: { person: "bo" },
  does: "Look at the change and say yes or what is wrong.",
  leaves: [okay],
  otherwise: { drop: "Bo said no" },
});
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

const kinds: readonly Kind[] = [bug, person];

function widerThan(old: Mandate, now: Mandate): boolean {
  const rank = { off: 0, ask: 1, on: 2 } as const;
  for (const g of now.grants)
    for (const [action, p] of Object.entries(g.may)) {
      const was = old.grants.find((x) => x.account === g.account && (x.place === g.place || x.place === "*"))?.may[action] ?? "off";
      if (rank[p] > rank[was]) return true;
    }
  return Object.entries(now.limits).some(([k, v]) => {
    const was = old.limits[k as keyof Mandate["limits"]];
    return was !== undefined && v > was;
  });
}

/** A small seeded random walk over every kind of event, from whatever state it is in. */
function walk(seed: number, kind: Kind, steps: number, onStep: (before: Work, event: WorkEvent, r: ReturnType<typeof works.move>) => void) {
  let s = seed;
  const rnd = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)] as T;
  let w = fresh(kind, { waits: rnd() < 0.2 }).work;
  let now = at;
  for (let n = 0; n < steps; n += 1) {
    now += Math.floor(rnd() * 2 * DAY) + MIN;
    if (w.next && rnd() < 0.15) now = Math.max(now, w.next.by + 1);
    const key = `k${seed}-${n}`;
    const thread = w.threads.length > 0 && rnd() < 0.8 ? pick(w.threads).id : `ghost-${n}`;
    const base = { key, at: now };
    const evidence = (): Evidence[] =>
      rnd() < 0.4
        ? []
        : [
            evid(
              pick([said.id, tests.id, merged.id, fixed.id, closed.id]),
              rnd() < 0.7,
              pick([doerBy(thread), reviewer(thread), { code: true }, { person: "bo" }]),
              0,
            ),
          ].map((e) => ({ ...e, at: now }));
    const events: readonly WorkEvent[] = [
      { ...base, is: "started", thread: `t${n}`, agent: pick(["doer", "reviewer"]) },
      { ...base, is: "said done when", checks: rnd() < 0.9 ? [fixed, closed] : [] },
      { ...base, is: "reported", thread, result: pick(["done", "done", "no", "stuck"] as const), says: `says ${n}`, evidence: evidence() },
      { ...base, is: "unanswered", thread, why: `died ${n}` },
      { ...base, is: "checked", thread, says: `looked ${n}`, evidence: evidence() },
      { ...base, is: "heard", from: rnd() < 0.8 ? from : { ...from, id: "999" }, event: "issue_comment", item: `i${n}` },
      { ...base, is: "follows", thread: { ...from, id: `${400 + n}` } },
      { ...base, is: "asked", ask: `a${n}`, person: pick(["bo", "chidi"]), by: now + DAY },
      { ...base, is: "answered", ask: w.waits?.ask ?? `a${n}`, person: "bo", answer: `answer ${n}` },
      {
        ...base,
        is: "passed",
        by: pick(["ci", "person", "connector"] as const),
        check: pick([said.id, tests.id, merged.id, fixed.id, closed.id, okay.id]),
      },
      { ...base, is: "failed", by: "ci", check: pick([tests.id, merged.id]), says: `red ${n}` },
      { ...base, is: "finished outside", as: pick(["done", "no"] as const), says: `outside ${n}` },
      { ...base, is: "due" },
      { ...base, is: "spent", cost: w.cost + rnd() * 3, over: pick([null, null, "work", "manager", "workspace"] as const) },
      { ...base, is: "moved", person: "bo", step: pick([...kind.steps.map((x) => x.id), "nowhere"]) },
      { ...base, is: "stopped", person: "ama", why: `stop ${n}` },
      { ...base, is: "opened again", person: "ama", why: `again ${n}` },
      { ...base, is: "narrowed", mandate: pick([mandate, narrower, widerOne]) },
      { ...base, is: "handed over", manager: "docs", work: `w-${n}` },
    ];
    // Most events are about the doing; the ones that end it are rare, so that the walk gets somewhere.
    const rare = new Set(["stopped", "finished outside", "handed over", "opened again", "narrowed"]);
    const event = pick(events.filter((e) => !rare.has(e.is) || rnd() < 0.12));
    const r = works.move(w, event, kind);
    onStep(w, event, r);
    if (r._tag === "Moved" || r._tag === "Same") w = r.work;
  }
}

const narrower: Mandate = {
  ...mandate,
  grants: [{ account: "github", place: "acme/web", may: { "github.read": "on" } }],
  limits: { perWork: 5 },
};
const widerOne: Mandate = {
  ...mandate,
  grants: [{ account: "github", place: "acme/web", may: { "github.read": "on", "github.push": "on" } }],
};

describe("work: always a next", () => {
  it("rules:work/next-always-set-with-a-date-while-open", () => {
    let seen = 0;
    const tags = new Set<string>();
    let owner = new Map<string, string>();
    for (const kind of kinds)
      for (let seed = 1; seed <= 60; seed += 1)
        walk(seed, kind, 50, (before, event, r) => {
          if (event.key.endsWith("-0")) owner = new Map();
          const frozen = structuredClone(before);
          tags.add(`${event.is}:${r._tag}`);
          expect(before, "the work it was given").toEqual(frozen);
          if (r._tag === "Refused") return plain(r.why);
          seen += 1;
          const w = r.work;
          expect(w.mandate.grants.length).toBeGreaterThanOrEqual(0);
          if (w.ended === null) {
            // Open work always has a next, and it has a date.
            expect(w.next, `${event.is} left it without a next`).not.toBeNull();
            expect(Number.isFinite(w.next?.by)).toBe(true);
            plain(w.next?.what ?? "");
            if (r._tag === "Moved" && JSON.stringify(w.next) !== JSON.stringify(before.next))
              expect(w.next?.by, event.is).toBeGreaterThan(event.at);
            // Quiet past its date, it looks, and the date moves on.
            if (r._tag === "Moved" && event.is === "due" && before.next && event.at >= before.next.by)
              expect(w.next?.by).toBeGreaterThan(event.at);
          } else {
            // Ended work has nothing to do next, and nothing running.
            expect(w.next).toBeNull();
            expect(w.threads.every((t) => t.state === "ended")).toBe(true);
            expect(w.ended.why.length).toBeGreaterThan(0);
          }
          // A to-do is done once, under its key: no two with one key.
          if (r._tag === "Moved") {
            const keys = r.todo.map((t) => t.key);
            expect(new Set(keys).size).toBe(keys.length);
            // Each is done once under its key, so a key is never reused by another event.
            for (const key of keys) {
              expect(owner.get(key) ?? event.key, `${key} of ${event.key}`).toBe(event.key);
              owner.set(key, event.key);
            }
            // Whenever it says when it looks next, something is set to wake it then.
            if (w.ended === null && JSON.stringify(w.next) !== JSON.stringify(before.next))
              expect(
                r.todo.some((t) => t.do === "wake" && t.at === w.next?.by),
                `${event.is} set a next and no wake`,
              ).toBe(true);
            // Seen again, the same event changes nothing and gives nothing new.
            const again = works.move(w, event, kind);
            if (again._tag === "Moved") {
              expect(again.work).toEqual(w);
              for (const t of again.todo) expect(keys).toContain(t.key);
            } else if (again._tag === "Same") expect(again.work).toEqual(w);
            // What is stopped or done stays so, but for a person opening it again.
            if (w.ended !== null && event.is !== "opened again") {
              const late = works.move(
                w,
                { key: "late", at: event.at + MIN, is: "heard", from, event: "issue_comment", item: "late" },
                kind,
              );
              nothing(late, w);
            }
            // A mandate never grows.
            expect(widerThan(mandate, w.mandate)).toBe(false);
          }
        });
    // The walk went through all of it.
    expect(seen).toBeGreaterThan(2000);
    for (const is of [
      "started",
      "reported",
      "checked",
      "passed",
      "failed",
      "due",
      "asked",
      "answered",
      "spent",
      "moved",
      "stopped",
      "narrowed",
    ])
      expect(
        [...tags].some((t) => t.startsWith(`${is}:Moved`)),
        is,
      ).toBe(true);
  });
});
