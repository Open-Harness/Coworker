import { describe, expect, it } from "vitest";
import { choosing } from "~/modules/choosing/service.ts";
import type { Levels, Limit, ModelOn, Usage } from "~/modules/choosing/types.ts";

const on = (connection: string, model: string, more: Partial<ModelOn> = {}): ModelOn => ({
  connection,
  model,
  works: true,
  thinks: true,
  ...more,
});
const small = on("anthropic", "haiku");
const mid = on("anthropic", "sonnet");
const big = on("openai", "gpt-big");
const models = [small, mid, big];
const pick = (connection: string, model: string, thinking: "off" | "low" | "medium" | "high" = "medium") =>
  ({ connection, model, thinking }) as const;
const levels = (more: Partial<Levels> = {}): Levels => ({
  agent: "inherit",
  manager: "inherit",
  workspace: pick("openai", "gpt-big", "low"),
  mayFallBack: false,
  ...more,
});
/** A plain sentence: something is said, and it is not a state word. */
const plain = (text: string) => {
  expect(text.trim().length).toBeGreaterThan(3);
  expect(text).not.toMatch(/\b(blocked|pending)\b/iu);
};
const limit = (is: Limit["is"], most: number, spent: number, tellAt = 0.8): Limit => ({ is, most, spent, tellAt });

describe("choosing", () => {
  it("rules:choosing/most-specific-level-wins", () => {
    // The agent's own, else its manager's, else the workspace's (M2).
    const cases: readonly [Levels, "agent" | "manager" | "workspace", string, string][] = [
      [levels({ agent: pick("anthropic", "haiku", "high"), manager: pick("anthropic", "sonnet") }), "agent", "haiku", "high"],
      [levels({ agent: "inherit", manager: pick("anthropic", "sonnet", "off") }), "manager", "sonnet", "off"],
      [levels(), "workspace", "gpt-big", "low"],
    ];
    for (const [given, from, model, thinking] of cases) {
      const chosen = choosing.choose(given, models);
      expect(chosen).toMatchObject({ _tag: "Chosen", from, model, thinking });
      expect(chosen._tag === "Chosen" && "instead" in chosen && chosen.instead !== undefined).toBe(false);
    }
    // The connection comes with the model: two connections may offer the same model name.
    const twice = [on("a", "same"), on("b", "same")];
    expect(choosing.choose(levels({ agent: pick("b", "same") }), twice)).toMatchObject({ _tag: "Chosen", connection: "b", model: "same" });
    // A model that works on one connection is not one that works on the other.
    const oneDown = [on("a", "same"), on("b", "same", { works: false })];
    expect(choosing.choose(levels({ agent: pick("b", "same"), workspace: null }), oneDown)._tag).toBe("None");
    expect(choosing.choose(levels({ agent: pick("a", "same"), workspace: null }), oneDown)).toMatchObject({
      _tag: "Chosen",
      connection: "a",
    });
    // Nothing chosen anywhere: nothing, and it says so.
    const none = choosing.choose(levels({ workspace: null }), models);
    expect(none._tag).toBe("None");
    if (none._tag === "None") plain(none.why);
  });

  it("rules:choosing/fallback-says-so-or-waits", () => {
    const broken = models.map((m) => (m.model === "haiku" ? { ...m, works: false } : m));
    const asked = levels({ agent: pick("anthropic", "haiku", "high"), manager: pick("anthropic", "sonnet", "low") });
    // Not allowed: it waits, and says which one does not work.
    const waits = choosing.choose(asked, broken);
    expect(waits._tag).toBe("None");
    if (waits._tag === "None") expect(waits.why).toMatch(/haiku/u);
    // Allowed: the next one up is used, and says which and why.
    const next = choosing.choose({ ...asked, mayFallBack: true }, broken);
    expect(next).toMatchObject({ _tag: "Chosen", model: "sonnet", from: "manager", thinking: "low" });
    expect(next._tag === "Chosen" && next.instead).toMatch(/haiku/u);
    // Up means the level above, not any other model, and past a level that is only `inherit`.
    const skip = choosing.choose({ ...asked, manager: "inherit", mayFallBack: true }, broken);
    expect(skip).toMatchObject({ _tag: "Chosen", model: "gpt-big", from: "workspace", thinking: "low" });
    // A working one needs no fallback, allowed or not.
    expect(choosing.choose({ ...asked, mayFallBack: true }, models)).toMatchObject({ model: "haiku", from: "agent" });
    // Every level up is down too: it waits.
    const allDown = models.map((m) => ({ ...m, works: false }));
    expect(choosing.choose({ ...asked, mayFallBack: true }, allDown)._tag).toBe("None");
    // A model that is not connected at all counts as one that does not work.
    const gone = models.filter((m) => m.model !== "haiku");
    expect(choosing.choose(asked, gone)._tag).toBe("None");
    expect(choosing.choose({ ...asked, mayFallBack: true }, gone)).toMatchObject({ _tag: "Chosen", model: "sonnet", from: "manager" });
    // The one above that is the same one is not another one.
    const same = levels({
      agent: pick("anthropic", "haiku"),
      manager: pick("anthropic", "haiku"),
      workspace: pick("anthropic", "haiku"),
      mayFallBack: true,
    });
    expect(choosing.choose(same, broken)._tag).toBe("None");
  });

  it("rules:choosing/unknown-price-is-never-zero", () => {
    const priced = on("anthropic", "sonnet", { price: { input: 3, cached: 0.3, output: 15 } });
    const usage: Usage = { input: 1_000_000, cached: 2_000_000, output: 100_000 };
    const known = choosing.price(usage, priced);
    expect(known.known).toBe(true);
    expect(known.known && known.dollars).toBeCloseTo(3 + 0.6 + 1.5, 9);
    expect(choosing.price({ input: 0, cached: 0, output: 0 }, priced)).toEqual({ known: true, dollars: 0 });
    // No price, or no such model: not known, with how many tokens it was. Never zero dollars.
    for (const model of [on("anthropic", "mystery"), undefined]) {
      const price = choosing.price(usage, model);
      expect(price.known).toBe(false);
      expect(!price.known && price.tokens).toBe(3_100_000);
      expect("dollars" in price).toBe(false);
    }
    // Added: what is known is summed, and what is not is counted, not hidden.
    const sum = choosing.add([
      { known: true, dollars: 1.25 },
      { known: false, tokens: 10 },
      { known: true, dollars: 0.5 },
      { known: false, tokens: 3 },
    ]);
    expect(sum.dollars).toBeCloseTo(1.75, 9);
    expect(sum.notKnown).toBe(2);
    expect(choosing.add([])).toEqual({ dollars: 0, notKnown: 0 });
    expect(choosing.add([{ known: false, tokens: 5 }])).toEqual({ dollars: 0, notKnown: 1 });
    // Adding in any order gives the same.
    const parts = [1, 2, 3, 4].map((n) => ({ known: true, dollars: n / 10 }) as const);
    expect(choosing.add([...parts].reverse()).dollars).toBeCloseTo(choosing.add(parts).dollars, 9);
  });

  it("rules:choosing/narrowest-reached-limit", () => {
    // Reached: spent is the most or more.
    const reached = choosing.room([limit("workspace", 50, 50), limit("work", 5, 5), limit("manager", 20, 10)]);
    expect(reached).toMatchObject({ _tag: "Over", is: "work" });
    if (reached._tag === "Over") {
      plain(reached.says);
      expect(reached.says).toMatch(/work/iu);
    }
    // The narrowest wins whatever the order: work, then manager, then workspace.
    for (const order of [
      [limit("manager", 20, 25), limit("workspace", 50, 99)],
      [limit("workspace", 50, 99), limit("manager", 20, 25)],
    ]) {
      const said = choosing.room(order);
      expect(said).toMatchObject({ _tag: "Over", is: "manager" });
    }
    expect(choosing.room([limit("workspace", 50, 51)])).toMatchObject({ _tag: "Over", is: "workspace" });
    // One short of the most is not reached.
    expect(choosing.room([limit("work", 5, 4.99, 1)])._tag).not.toBe("Over");
    // A reached limit beats a near one, also when the near one is narrower.
    expect(choosing.room([limit("work", 10, 9), limit("workspace", 50, 50)])).toMatchObject({ _tag: "Over", is: "workspace" });
    // Nothing near and nothing reached: room.
    expect(choosing.room([limit("work", 10, 1), limit("manager", 10, 2), limit("workspace", 10, 3)])).toEqual({ _tag: "Room" });
    expect(choosing.room([])).toEqual({ _tag: "Room" });
  });

  it("rules:choosing/near-a-limit-tells", () => {
    // Near: spent is at least `tellAt` of the most, and not yet the most.
    const near = choosing.room([limit("manager", 100, 80, 0.8)]);
    expect(near._tag).toBe("Tell");
    if (near._tag === "Tell") {
      plain(near.says);
      expect(near.says).toMatch(/manager/iu);
    }
    expect(choosing.room([limit("manager", 100, 79, 0.8)])).toEqual({ _tag: "Room" });
    expect(choosing.room([limit("manager", 100, 99, 0.8)])._tag).toBe("Tell");
    // Each limit has its own tellAt.
    expect(choosing.room([limit("work", 10, 5, 0.5), limit("workspace", 10, 5, 0.9)])._tag).toBe("Tell");
    expect(choosing.room([limit("work", 10, 5, 0.6), limit("workspace", 10, 5, 0.9)])).toEqual({ _tag: "Room" });
    // Several near: the first one is the one told.
    const first = choosing.room([limit("workspace", 100, 90), limit("work", 100, 90)]);
    expect(first._tag === "Tell" && first.says).toMatch(/workspace|day/iu);
    // Not the most, even when it is only just under with a tellAt of 1.
    expect(choosing.room([limit("work", 100, 100, 1)])._tag).toBe("Over");
  });

  it("rules:choosing/parts-never-add-to-more-than-whole", () => {
    const sum = (parts: Readonly<Record<string, number>>) => Object.values(parts).reduce((a, b) => a + b, 0);
    // Enough for all: each gets what it asked.
    expect(choosing.parts(100, { coding: 30, sales: 20 })).toEqual({ coding: 30, sales: 20 });
    expect(choosing.parts(50, { coding: 30, sales: 20 })).toEqual({ coding: 30, sales: 20 });
    // Too little: in parts, in proportion, never more than was asked, never more than the whole.
    const cut = choosing.parts(40, { coding: 60, sales: 20, support: 20 });
    expect(Object.keys(cut).sort()).toEqual(["coding", "sales", "support"]);
    expect(sum(cut)).toBeLessThanOrEqual(40 + 1e-9);
    expect(cut["coding"]).toBeCloseTo(24, 6);
    expect(cut["sales"]).toBeCloseTo(8, 6);
    expect(cut["support"]).toBeCloseTo(8, 6);
    // Nothing to give, nobody asking.
    expect(choosing.parts(0, { coding: 5 })).toEqual({ coding: 0 });
    expect(choosing.parts(100, {})).toEqual({});
    expect(choosing.parts(100, { coding: 0, sales: 10 })).toEqual({ coding: 0, sales: 10 });
    // Seeded: any asks, any whole.
    let seed = 20261125;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let round = 0; round < 200; round += 1) {
      const whole = Math.round(next() * 1000) / 10;
      const asks: Record<string, number> = {};
      for (let n = 0; n < 1 + Math.floor(next() * 6); n += 1) asks[`m${n}`] = Math.round(next() * 500) / 10;
      const parts = choosing.parts(whole, asks);
      expect(Object.keys(parts).sort()).toEqual(Object.keys(asks).sort());
      expect(sum(parts)).toBeLessThanOrEqual(whole + 1e-9);
      for (const [id, ask] of Object.entries(asks)) {
        const part = parts[id] ?? Number.NaN;
        expect(part).toBeGreaterThanOrEqual(0);
        expect(part).toBeLessThanOrEqual(ask + 1e-9);
      }
      // Whoever asks for more never gets less.
      const entries = Object.entries(asks).sort((a, b) => a[1] - b[1]);
      for (let n = 1; n < entries.length; n += 1) {
        const [lessId, less] = entries[n - 1] ?? ["", 0];
        const [moreId, more] = entries[n] ?? ["", 0];
        if (more > less) expect(parts[moreId] ?? 0).toBeGreaterThanOrEqual((parts[lessId] ?? 0) - 1e-9);
      }
    }
  });
});
