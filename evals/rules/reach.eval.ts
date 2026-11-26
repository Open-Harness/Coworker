import { describe, expect, it } from "vitest";
import { reaches } from "~/modules/reach/service.ts";
import type { Mandate, Reach, Spent } from "~/modules/reach/types.ts";

const whole: Reach = {
  grants: [
    {
      account: "github",
      place: "acme/web",
      may: { "github.read": "on", "github.comment": "on", "github.push": "ask", "github.merge": "ask" },
    },
    { account: "email", place: "*", may: { "email.reply": "on", "email.send_outside": "ask" } },
  ],
  limits: { perWork: 10, perDay: 40, atOnce: 3, hours: 48 },
};
const one = (may: Record<string, "on" | "ask" | "off">, place = "acme/web", account = "github"): Reach => ({
  grants: [{ account, place, may }],
  limits: {},
});
const given = { strength: "asked", because: { by: "person", id: "ama" }, version: 6 } as const;
const none: Spent = { work: 0, day: 0, month: 0, hours: 0 };
const at = Date.UTC(2026, 10, 25, 9, 54);
const use = (action: string, place = "acme/web", account = "github") => ({ action, account, place, at });
const mandate = (part: Reach, more: Partial<Mandate> = {}): Mandate => ({ ...reaches.mandate(whole, part, given).mandate, ...more });

describe("reach", () => {
  it("rules:reach/handed-on", () => {
    const part = one({ "github.read": "on", "github.push": "ask" });
    expect(reaches.handOn(whole, part)).toEqual({ _tag: "Handed", reach: part });
    expect(reaches.wider(whole, part)).toEqual([]);
    // Ask is less than on, and off is less than ask.
    expect(reaches.wider(whole, one({ "github.comment": "ask", "github.merge": "off" }))).toEqual([]);
    // A place of an account handed whole is a part of it.
    expect(reaches.wider(whole, one({ "email.reply": "on" }, "sales", "email"))).toEqual([]);
    // The same is not wider: a reach to itself, a place of `*` under `*`, a limit that is equal, nothing at all.
    expect(reaches.handOn(whole, whole)).toEqual({ _tag: "Handed", reach: whole });
    expect(reaches.wider(whole, one({ "email.reply": "on" }, "*", "email"))).toEqual([]);
    expect(reaches.wider(whole, { grants: [], limits: { ...whole.limits } })).toEqual([]);
    expect(reaches.wider(whole, { grants: [], limits: {} })).toEqual([]);
    // Off is less than nothing at all, even for an action the whole has never heard of; a limit the whole has not is no limit.
    expect(reaches.wider(whole, one({ "github.nuke": "off" }))).toEqual([]);
    expect(reaches.wider(whole, { grants: [], limits: { perMonth: 1_000_000 } })).toEqual([]);
  });

  it("rules:reach/wider-is-refused", () => {
    const wide: readonly [Reach, RegExp][] = [
      [one({ "github.merge": "on" }), /github\.merge/u],
      [one({ "github.label": "on" }), /github\.label/u],
      [one({ "github.read": "on" }, "acme/api"), /acme\/api/u],
      [one({ "github.read": "on" }, "*"), /\*/u],
      [one({ "crm.read": "on" }, "*", "crm"), /crm/u],
      [{ grants: [], limits: { perWork: 11 } }, /11|perWork|piece of work/u],
      [{ grants: [], limits: { atOnce: 4 } }, /4|atOnce|at once/u],
      [{ grants: [], limits: { perDay: 41 } }, /41|perDay|day/u],
      [{ grants: [], limits: { hours: 49 } }, /49|hours/u],
      [one({ "github.push": "on" }), /github\.push/u],
      [one({ "github.nuke": "ask" }), /github\.nuke/u],
      [one({ "email.nuke": "on" }, "sales", "email"), /email\.nuke/u],
    ];
    for (const [part, names] of wide) {
      const said = reaches.handOn(whole, part);
      expect(said._tag).toBe("Wider");
      expect(said._tag === "Wider" && said.why.length).toBe(1);
      expect(said._tag === "Wider" && said.why[0]).toMatch(names);
    }
    // The same holds for a limit the whole has, one at a time.
    const monthly: Reach = { ...whole, limits: { ...whole.limits, perMonth: 100 } };
    expect(reaches.wider(monthly, { grants: [], limits: { perMonth: 101 } })).toHaveLength(1);
    expect(reaches.wider(monthly, { grants: [], limits: { perMonth: 100 } })).toEqual([]);
    // Every wider thing is said, not only the first.
    expect(
      reaches.wider(whole, { grants: one({ "github.merge": "on", "github.label": "on" }).grants, limits: { perWork: 50 } }),
    ).toHaveLength(3);
  });

  it("rules:reach/mandate-is-a-part", () => {
    const { mandate: made, leftOut } = reaches.mandate(whole, one({ "github.read": "on", "github.merge": "on", "crm.read": "on" }), given);
    expect(reaches.wider(whole, made)).toEqual([]);
    expect(made.grants[0]?.may).toEqual({ "github.read": "on", "github.merge": "ask" });
    expect(leftOut).toHaveLength(2);
    expect(made).toMatchObject({ strength: "asked", because: { by: "person", id: "ama" }, version: 6, state: "holds" });
    // Limits it did not ask for are those above it.
    expect(made.limits).toEqual(whole.limits);
  });

  it("rules:reach/never-grows", () => {
    const made = mandate(one({ "github.read": "on", "github.push": "ask" }));
    const bigger: Reach = {
      grants: [{ account: "github", place: "*", may: { "github.read": "on", "github.push": "on", "github.merge": "on" } }],
      limits: {},
    };
    expect(reaches.narrow(made, bigger)).toEqual(made);
    const smaller: Reach = { ...whole, grants: [{ account: "github", place: "acme/web", may: { "github.read": "on" } }] };
    expect(reaches.narrow(made, smaller).grants[0]?.may).toEqual({ "github.read": "on" });
    // Narrowed, and then given back above: it stays narrow.
    expect(reaches.narrow(reaches.narrow(made, smaller), whole).grants[0]?.may).toEqual({ "github.read": "on" });
    // Nothing left of it: taken back.
    expect(reaches.narrow(made, { grants: [], limits: {} }).state).toBe("taken back");
  });

  it("rules:reach/allowed", () => {
    const made = mandate(one({ "github.read": "on", "github.push": "ask" }));
    expect(reaches.allowed(made, use("github.read"), none).is).toBe("on");
    expect(reaches.allowed(made, use("github.push"), none).is).toBe("ask");
    expect(reaches.allowed(made, use("github.merge"), none).is).toBe("off");
    expect(reaches.allowed(made, use("github.read", "acme/api"), none).is).toBe("off");
    expect(reaches.allowed(made, use("email.reply", "*", "email"), none).is).toBe("off");
  });

  it("rules:reach/ended-allows-nothing", () => {
    for (const ended of [{ state: "stopped" }, { state: "taken back" }, { until: at - 1 }] as const)
      expect(reaches.allowed(mandate(one({ "github.read": "on" }), ended), use("github.read"), none).is).toBe("off");
    expect(reaches.allowed(mandate(one({ "github.read": "on" }), { until: at + 1 }), use("github.read"), none).is).toBe("on");
  });

  it("rules:reach/a-limit-asks", () => {
    const made = mandate(one({ "github.read": "on", "github.push": "ask" }));
    for (const [spent, names] of [
      [{ ...none, work: 10 }, /piece of work|10/u],
      [{ ...none, day: 40 }, /day|40/u],
      [{ ...none, hours: 48 }, /hours|48/u],
    ] as const) {
      const said = reaches.allowed(made, use("github.read"), spent);
      expect(said.is).toBe("ask");
      expect(said.why).toMatch(names);
    }
    // Reached never opens what was off.
    expect(reaches.allowed(made, use("github.merge"), { ...none, work: 10 }).is).toBe("off");
    expect(reaches.allowed(made, use("github.read"), { ...none, work: 9.99 }).is).toBe("on");
  });
  it("rules:reach/mandate-says-what-it-left-out", () => {
    const asked: Reach = { grants: one({ "github.read": "on", "github.push": "on" }).grants, limits: { perWork: 50, perDay: 40 } };
    const { mandate: made, leftOut } = reaches.mandate(whole, asked, {
      ...given,
      strength: "found",
      because: { by: "kind", kind: "bug" },
      until: at + 5,
    });
    // Beyond the reach is cut to the reach, and each cut is said: the action, and the limit.
    expect(made.grants[0]?.may).toEqual({ "github.read": "on", "github.push": "ask" });
    expect(made.limits).toEqual(whole.limits);
    expect(leftOut).toHaveLength(2);
    expect(leftOut.some((said) => /github\.push/u.test(said))).toBe(true);
    expect(leftOut.some((said) => /50|perWork|piece of work/u.test(said))).toBe(true);
    for (const said of leftOut) expect(said.trim().length).toBeGreaterThan(0);
    expect(made).toMatchObject({ strength: "found", because: { by: "kind", kind: "bug" }, until: at + 5, state: "holds" });
    // What fits is not cut, and nothing is said; a lower limit of its own stays lower; no `until` given is none.
    const fits = reaches.mandate(
      whole,
      { grants: one({ "github.read": "on", "github.push": "ask" }).grants, limits: { perWork: 4 } },
      given,
    );
    expect(fits.leftOut).toEqual([]);
    expect(fits.mandate.grants[0]?.may).toEqual({ "github.read": "on", "github.push": "ask" });
    expect(fits.mandate.limits).toEqual({ ...whole.limits, perWork: 4 });
    expect("until" in fits.mandate).toBe(false);
    // An account that is not above is left out whole, and said.
    const crm = reaches.mandate(whole, one({ "crm.read": "on" }, "*", "crm"), given);
    expect(crm.mandate.grants).toEqual([]);
    expect(crm.leftOut).toHaveLength(1);
    expect(crm.leftOut[0]).toMatch(/crm/u);
    // Asking for no more than `ask` where the whole says `ask`, and a place the whole covers with `*`.
    const wide = reaches.mandate(whole, one({ "email.reply": "on", "email.send_outside": "ask" }, "sales", "email"), given);
    expect(wide.mandate.grants[0]?.may).toEqual({ "email.reply": "on", "email.send_outside": "ask" });
    expect(wide.leftOut).toEqual([]);
  });

  it("rules:reach/narrow-follows-the-limits-down", () => {
    const made = mandate(one({ "github.read": "on", "github.push": "ask" }));
    const before = JSON.stringify(made);
    const lower: Reach = { ...whole, limits: { ...whole.limits, perWork: 5, hours: 12 } };
    const narrow = reaches.narrow(made, lower);
    expect(narrow.limits).toEqual({ ...whole.limits, perWork: 5, hours: 12 });
    expect(narrow.grants).toEqual(made.grants);
    expect(narrow).toMatchObject({ strength: "asked", because: { by: "person", id: "ama" }, version: 6, state: "holds" });
    // Given back above, it stays where it was.
    expect(reaches.narrow(narrow, whole).limits).toEqual(narrow.limits);
    expect(reaches.narrow(narrow, { ...whole, limits: { perWork: 50, hours: 500 } }).limits).toEqual(narrow.limits);
    // Equal is not lower; a reach with no limit of its own does not take the mandate's away.
    expect(reaches.narrow(made, whole).limits).toEqual(made.limits);
    expect(reaches.narrow(made, { grants: whole.grants, limits: {} }).limits).toEqual(made.limits);
    // The one it was made from is not changed, and a stop is not undone.
    expect(JSON.stringify(made)).toBe(before);
    expect(reaches.narrow({ ...made, state: "stopped" }, whole).state).toBe("stopped");
    expect(reaches.narrow({ ...made, state: "taken back" }, whole).state).toBe("taken back");
    // A permission goes down with the reach above, and an action that is gone is not kept as off.
    const asks: Reach = {
      grants: [{ account: "github", place: "acme/web", may: { "github.read": "ask", "github.push": "on" } }],
      limits: whole.limits,
    };
    expect(reaches.narrow(made, asks).grants[0]?.may).toEqual({ "github.read": "ask", "github.push": "ask" });
  });

  it("rules:reach/every-limit-asks-where-it-is-reached", () => {
    const monthly: Reach = { ...whole, limits: { ...whole.limits, perMonth: 100 } };
    const made = { ...reaches.mandate(monthly, one({ "github.read": "on", "github.push": "ask", "github.merge": "off" }), given).mandate };
    for (const [key, limit, says] of [
      ["work", 10, /piece of work|10/u],
      ["day", 40, /day|40/u],
      ["month", 100, /month|100/u],
      ["hours", 48, /hours|48/u],
    ] as const) {
      const at = (value: number) => ({ ...none, [key]: value });
      expect(reaches.allowed(made, use("github.read"), at(limit - 0.01)).is, key).toBe("on");
      const reached = reaches.allowed(made, use("github.read"), at(limit));
      expect(reached.is, key).toBe("ask");
      expect(reached.why, key).toMatch(says);
      expect(reaches.allowed(made, use("github.read"), at(limit + 1)).is, key).toBe("ask");
      // Ask stays ask, and off stays off.
      expect(reaches.allowed(made, use("github.push"), at(limit)).is, key).toBe("ask");
      expect(reaches.allowed(made, use("github.merge"), at(limit)).is, key).toBe("off");
    }
    // Two limits reached at once is still one answer; no limit of its own and none above is never reached.
    expect(reaches.allowed(made, use("github.read"), { work: 10, day: 40, month: 100, hours: 48 }).is).toBe("ask");
    const free = { ...made, limits: {} };
    expect(reaches.allowed(free, use("github.read"), { work: 1e9, day: 1e9, month: 1e9, hours: 1e9 }).is).toBe("on");
    // A grant for every place of an account allows every place, and one place does not allow another.
    const anywhere = mandate(one({ "email.reply": "on" }, "*", "email"));
    expect(reaches.allowed(anywhere, use("email.reply", "sales", "email"), none).is).toBe("on");
    expect(reaches.allowed(anywhere, use("email.reply", "*", "email"), none).is).toBe("on");
    expect(reaches.allowed(anywhere, use("email.reply", "sales"), none).is).toBe("off");
    expect(reaches.allowed(mandate(one({ "github.read": "on" })), use("github.read", "acme/api"), none).is).toBe("off");
    // Every answer says something.
    for (const said of [
      reaches.allowed(made, use("github.read"), none),
      reaches.allowed(made, use("github.merge"), none),
      reaches.allowed({ ...made, state: "stopped" }, use("github.read"), none),
    ])
      expect(said.why.trim().length).toBeGreaterThan(0);
  });
});
