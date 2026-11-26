import { describe, expect, it } from "vitest";
import { intake } from "~/modules/intake/service.ts";
import type { Actor, DecideInput, Decision, Hears, Item, OpenWork, Verdict } from "~/modules/intake/types.ts";
import type { AskRule, Kind } from "~/modules/playbook/types.ts";
import type { Mandate, Permission } from "~/modules/reach/types.ts";

const at = Date.UTC(2026, 10, 25, 9, 54);
const rule = (more: Partial<AskRule> = {}): AskRule => ({
  account: "github",
  place: "acme/web",
  listed: { who: ["ama"] },
  others: "maybe",
  overheard: "maybe",
  bots: [],
  ...more,
});
const ama: Actor = { address: "github:5002", name: "Ama Mensah", bot: false, person: "ama", standing: "write" };
const pat: Actor = { address: "github:5001", name: "Pat Reyes", bot: false };
const item = (more: Partial<Item> = {}): Item => ({
  id: "i1",
  trigger: "issues",
  by: "event",
  account: "github",
  place: "acme/web",
  thread: "github:acme/web#412",
  event: "issue.opened",
  actor: ama,
  addressed: true,
  at,
  title: "Login fails",
  text: "It fails when I sign in.",
  same: "k1",
  ...more,
});
const kind = (id: string, alone: Kind["alone"], more: Partial<Kind> = {}): Kind => ({
  id,
  name: id,
  when: `Something is ${id}`,
  alone,
  steps: [],
  doneWhen: [],
  may: [{ account: "github", place: "acme/web", may: { "github.read": "on", "github.comment": "on", "github.merge": "ask" } }],
  limits: { perWork: 5, hours: 24 },
  look: "1d",
  ...more,
});
const hears = (manager: string, kinds: readonly Kind[], more: Partial<Hears> = {}): Hears => ({
  manager,
  name: `The ${manager} manager`,
  version: 6,
  paused: false,
  mayAsk: [rule()],
  kinds,
  reach: {
    grants: [
      {
        account: "github",
        place: "acme/web",
        may: { "github.read": "on", "github.comment": "on", "github.merge": "ask", "github.push": "on" },
      },
    ],
    limits: { perWork: 10, hours: 48 },
  },
  open: 0,
  spent: 0,
  ...more,
});
const v = (manager: string, kindId: string, is: boolean, fit: number, why = `Why ${manager} ${kindId} is ${is}.`): Verdict => ({
  manager,
  kind: kindId,
  is,
  why,
  fit,
});
const input = (hs: readonly Hears[], verdicts: readonly Verdict[], more: Partial<DecideInput> = {}, joins?: string): DecideInput => ({
  item: item(),
  hears: hs,
  open: [],
  judgement: { _tag: "Judged", judged: { verdicts, ...(joins ? { joins } : {}) } },
  now: at,
  ...more,
});
const said = (d: Decision) => {
  expect(d.why.trim().length).toBeGreaterThan(0);
  expect(d.why).not.toMatch(/blocked|pending/iu);
  return d;
};
const rank: Record<Permission, number> = { off: 0, ask: 1, on: 2 };
const stranger = { actor: pat } as const;
const pair = (manager: string, k: string) => ({ manager, kind: k });
const betweenOf = (d: Decision) => (d._tag === "Asked" ? [...d.between].map((b) => `${b.manager}/${b.kind}`).sort() : []);

/** A mandate is never wider than the reach it is a part of, nor than the kind that asked for it. */
function within(m: Mandate, h: Hears, k: Kind) {
  for (const g of m.grants)
    for (const [action, p] of Object.entries(g.may)) {
      const reach = h.reach.grants.find((r) => r.account === g.account && (r.place === g.place || r.place === "*"))?.may[action] ?? "off";
      const asked = k.may.find((r) => r.account === g.account && r.place === g.place)?.may[action] ?? "off";
      expect(rank[p], `${action} in the reach`).toBeLessThanOrEqual(rank[reach]);
      expect(rank[p], `${action} in the kind`).toBeLessThanOrEqual(rank[asked]);
    }
  for (const key of ["perWork", "perDay", "perMonth", "hours", "atOnce"] as const) {
    const bound = [k.limits[key], h.reach.limits[key]].filter((x): x is number => x !== undefined);
    if (bound.length > 0) expect(m.limits[key], key).toBeLessThanOrEqual(Math.min(...bound));
  }
}

describe("intake decide", () => {
  it("rules:intake/decide-asked-or-maybe-by-off-watch-ask-do", () => {
    const table: readonly [string, Partial<Item>, Kind["alone"], Decision["_tag"]][] = [
      ["asked, off", {}, "off", "Took"],
      ["asked, watch", {}, "watch", "Took"],
      ["asked, ask", {}, "ask", "Took"],
      ["asked, do", {}, "do", "Took"],
      ["maybe, off", stranger, "off", "Left"],
      ["maybe, watch", stranger, "watch", "Left"],
      ["maybe, ask", stranger, "ask", "Asked"],
      ["maybe, do", stranger, "do", "Took"],
      ["overheard, off", { addressed: false }, "off", "Left"],
      ["overheard, watch", { addressed: false }, "watch", "Left"],
      ["overheard, ask", { addressed: false }, "ask", "Asked"],
      ["overheard, do", { addressed: false }, "do", "Took"],
    ];
    for (const [name, more, alone, expected] of table) {
      const k = kind("bug", alone);
      const hs = [hears("coding", [k])];
      const verdicts = [v("coding", "bug", true, 0.9, "It is a bug in login.")];
      const d = said(intake.decide(input(hs, verdicts, { item: item(more) })));
      expect(d._tag, name).toBe(expected);
      expect(d.item).toBe("i1");
      expect(d.verdicts, name).toEqual(verdicts);
      expect(d.gated.map((g) => g.manager)).toEqual(["coding"]);
      if (d._tag === "Took") {
        expect([d.manager, d.kind, d.waits], name).toEqual(["coding", "bug", false]);
        expect(d.why).toMatch(/bug|The coding manager/u);
        const asked = more.actor === undefined && more.addressed === undefined;
        expect(d.mandate, name).toMatchObject(
          asked
            ? { strength: "asked", because: { by: "person", id: "ama" }, version: 6, state: "holds" }
            : { strength: "found", because: { by: "kind", kind: "bug" }, version: 6, state: "holds" },
        );
        within(d.mandate, hs[0]!, k);
      }
      if (d._tag === "Asked") expect(d.between, name).toEqual([pair("coding", "bug")]);
      // Watch says what it would have done; off says nothing of the kind.
      if (d._tag === "Left") expect(d.would, name).toEqual(alone === "watch" ? pair("coding", "bug") : undefined);
      if (d._tag !== "Left" || d.would) expect(d.why).toMatch(/bug|The coding manager/u);
    }
    // A kind that said no never takes it, whatever its setting.
    for (const alone of ["off", "watch", "ask", "do"] as const) {
      const d = said(intake.decide(input([hears("coding", [kind("bug", alone)])], [v("coding", "bug", false, 0.1)])));
      expect(d._tag).toBe("Left");
      expect(d._tag === "Left" && d.would).toBeUndefined();
    }
    // A mandate for someone who is only an address has that address as who asked.
    const bare = intake.decide(
      input([hears("coding", [kind("bug", "do")], { mayAsk: [rule({ others: "asked" })] })], [v("coding", "bug", true, 0.9)], {
        item: item(stranger),
      }),
    );
    expect(bare._tag === "Took" && bare.mandate.because).toEqual({ by: "person", id: "github:5001" });
  });

  it("rules:intake/decide-a-mandate-is-a-part", () => {
    const wide = kind("bug", "do", {
      may: [
        {
          account: "github",
          place: "acme/web",
          may: { "github.read": "on", "github.merge": "on", "github.push": "ask", "github.delete_repo": "on" },
        },
        { account: "crm", place: "*", may: { "crm.read": "on" } },
      ],
      limits: { perWork: 50, hours: 6, atOnce: 9 },
    });
    const h = hears("coding", [wide], { reach: { grants: hears("x", []).reach.grants, limits: { perWork: 10, hours: 48, atOnce: 3 } } });
    const d = intake.decide(input([h], [v("coding", "bug", true, 0.9)]));
    expect(d._tag).toBe("Took");
    if (d._tag !== "Took") return;
    within(d.mandate, h, wide);
    const may = d.mandate.grants.flatMap((g) => Object.entries(g.may));
    // What is in both is kept, as little as either gives; what the reach never had is not there.
    expect(Object.fromEntries(may.filter(([, p]) => p !== "off"))).toMatchObject({
      "github.read": "on",
      "github.merge": "ask",
      "github.push": "ask",
    });
    expect(may.some(([a, p]) => (a === "github.delete_repo" || a === "crm.read") && p !== "off")).toBe(false);
    expect(d.mandate.limits.perWork).toBe(10);
    expect(d.mandate.limits.hours).toBe(6);
    expect(d.mandate.limits.atOnce).toBe(3);
    // What the kind did not ask for is not given because the reach has it.
    expect(may.some(([a, p]) => a === "github.comment" && p !== "off")).toBe(false);
  });

  it("rules:intake/decide-several-managers-at-most-one-takes-it", () => {
    const mk = (name: string, alone: Kind["alone"] = "do", more: Partial<Hears> = {}) => hears(name, [kind("bug", alone)], more);
    const [a, b, c] = [mk("a"), mk("b"), mk("c")] as const;
    const fits = (x: number, y: number, z: number) => [v("a", "bug", true, x), v("b", "bug", true, y), v("c", "bug", true, z)];
    // The best fit takes it, wherever it is in the list.
    for (const order of [
      [a, b, c],
      [c, b, a],
      [b, c, a],
    ]) {
      const d = said(intake.decide(input(order, fits(0.4, 0.9, 0.6))));
      expect(d._tag === "Took" && d.manager).toBe("b");
    }
    // Only a manager that said yes can take it.
    expect(intake.decide(input([a, b], [v("a", "bug", false, 0.99), v("b", "bug", true, 0.3)]))).toMatchObject({
      _tag: "Took",
      manager: "b",
    });
    // A paused manager does not take it, and does not ask a better one's place.
    const paused = said(intake.decide(input([mk("a", "do", { paused: true })], [v("a", "bug", true, 0.99)])));
    expect(paused._tag).toBe("Left");
    // One that does not let this person in does not take it either: the next best does.
    const closed = mk("a", "do", { mayAsk: [rule({ others: "no", listed: { who: [] } })] });
    const d = intake.decide(input([closed, b, c], fits(0.99, 0.5, 0.75), { item: item(stranger) }));
    expect(d._tag).toBe("Took");
    expect(d._tag === "Took" && d.manager).toBe("c");
    expect(d.gated.map((g) => [g.manager, g.gated.let])).toEqual([
      ["a", "no"],
      ["b", "maybe"],
      ["c", "maybe"],
    ]);
    // The kinds of one manager compete the same way.
    const two = hears("a", [kind("bug", "do"), kind("feature", "do")]);
    expect(intake.decide(input([two], [v("a", "bug", true, 0.4), v("a", "feature", true, 0.8)]))).toMatchObject({
      _tag: "Took",
      kind: "feature",
    });
    // Seeded: spread-out fits, any number of managers: exactly the best takes it, and it keeps everyone's verdict.
    let seed = 20261125;
    const rnd = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    for (let round = 0; round < 40; round += 1) {
      const n = 2 + Math.floor(rnd() * 5);
      const names = Array.from({ length: n }, (_, i) => `m${i}`);
      const order = [...names].sort(() => rnd() - 0.5);
      const fit = new Map(order.map((name, i) => [name, 0.95 - i * 0.15]));
      const verdicts = names.map((name) => v(name, "bug", true, fit.get(name) ?? 0));
      const out = intake.decide(
        input(
          names.map((name) => mk(name)),
          verdicts,
        ),
      );
      expect(out._tag === "Took" && out.manager).toBe(order[0]);
      expect(out.verdicts).toHaveLength(n);
    }
  });

  it("rules:intake/decide-two-that-fit-equally-ask", () => {
    const mk = (name: string) => hears(name, [kind("bug", "do")]);
    const ask = (x: number, y: number, z?: number) =>
      intake.decide(
        input([mk("a"), mk("b"), mk("c")], [v("a", "bug", true, x), v("b", "bug", true, y), v("c", "bug", z !== undefined, z ?? 0.9)]),
      );
    // Within 0.1: it asks, and says between whom.
    for (const [x, y] of [
      [0.9, 0.9],
      [0.9, 0.85],
      [0.85, 0.9],
      [0.95, 0.86],
      [0.5, 0.45],
    ] as const) {
      const d = said(ask(x, y));
      expect(d._tag, `${x} ${y}`).toBe("Asked");
      expect(betweenOf(d)).toEqual(["a/bug", "b/bug"]);
    }
    // Further apart: the better one takes it.
    for (const [x, y, who] of [
      [0.95, 0.84, "a"],
      [0.6, 0.9, "b"],
      [0.9, 0.2, "a"],
    ] as const) {
      const d = ask(x, y);
      expect(d._tag, `${x} ${y}`).toBe("Took");
      expect(d._tag === "Took" && d.manager).toBe(who);
    }
    // Three: those near the best, not the one far below; one that said no is not in it.
    expect(betweenOf(ask(0.9, 0.85, 0.4))).toEqual(["a/bug", "b/bug"]);
    expect(betweenOf(ask(0.9, 0.85, 0.82))).toEqual(["a/bug", "b/bug", "c/bug"]);
    expect(ask(0.9, 0.3, undefined)._tag).toBe("Took");
    // Two kinds of one manager are two that fit.
    const one = hears("a", [kind("bug", "do"), kind("feature", "do")]);
    const d = intake.decide(input([one], [v("a", "bug", true, 0.8), v("a", "feature", true, 0.78)]));
    expect(betweenOf(d)).toEqual(["a/bug", "a/feature"]);
    // Two that only watch are not an ask: a person is not bothered by what nobody may do alone.
    const watchers = [hears("a", [kind("bug", "watch")]), hears("b", [kind("bug", "watch")])];
    const w = intake.decide(input(watchers, [v("a", "bug", true, 0.9), v("b", "bug", true, 0.9)], { item: item(stranger) }));
    expect(w._tag).toBe("Left");
  });

  it("rules:intake/decide-joins-open-work", () => {
    const h = hears("coding", [kind("bug", "do")]);
    const o: readonly OpenWork[] = [{ id: "w-5", manager: "coding", kind: "bug", title: "Fix login", follows: ["github:acme/web#5"] }];
    // The judge says it is about work that is open: it joins it, and takes nothing new, whatever else it said yes to.
    const d = said(intake.decide(input([h], [v("coding", "bug", true, 0.99)], { open: o }, "w-5")));
    expect(d._tag).toBe("Joined");
    expect(d._tag === "Joined" && d.work).toBe("w-5");
    expect(d.why).toMatch(/w-5/u);
    expect(d.verdicts).toHaveLength(1);
    // Not of a manager that does not let this person in: that would be adding words to work they cannot touch.
    const shut = hears("coding", [kind("bug", "do")], { mayAsk: [rule({ others: "no", listed: { who: [] } })] });
    const other = hears("support", [kind("bug", "do")]);
    const e = intake.decide(
      input([shut, other], [v("coding", "bug", true, 0.5), v("support", "bug", true, 0.9)], { open: o, item: item(stranger) }, "w-5"),
    );
    expect(e._tag).toBe("Took");
    expect(e._tag === "Took" && e.manager).toBe("support");
    // Work that is not open is nothing to join.
    expect(intake.decide(input([h], [v("coding", "bug", true, 0.9)], { open: o }, "w-404"))._tag).toBe("Took");
    // Without it, the same words take new work.
    expect(intake.decide(input([h], [v("coding", "bug", true, 0.9)], { open: o }))._tag).toBe("Took");
  });
});
