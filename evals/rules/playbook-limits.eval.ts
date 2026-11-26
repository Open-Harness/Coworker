import { describe, expect, it } from "vitest";
import { playbooks } from "~/modules/playbook/service.ts";
import type { Playbook, Problem, Surroundings, Trigger } from "~/modules/playbook/types.ts";
import { around, folder, mapStep, plain, playbookOf } from "./playbook-world.ts";

const repo = () => playbookOf("repo");
const customers = () => playbookOf("customers");
const check = (p: Playbook, a: Surroundings = around): readonly Problem[] => playbooks.check(p, a);
const says = (found: readonly Problem[], at: string, line: string, re: RegExp): boolean =>
  found.some((p) => p.at === at && p.line === line && re.test(p.says) && plain(p.says));
const kindLines = (p: Playbook) => p.kinds.flatMap((k) => [`workflow/${k.id}`, ...k.steps.map((s) => `workflow/${k.id}/${s.id}`)]);

const cron = (
  atMost: Trigger["atMost"] = { a: "day", count: 3 },
  makes: Trigger["makes"] = { kind: "bug" },
  agent = "reviewer",
): Trigger => ({
  id: "scan",
  name: "Scan the open issues",
  on: true,
  makes,
  only: "It is open",
  atMost,
  by: "cron",
  when: { cron: "0 9 * * 1-5", zone: "Europe/Berlin" },
  agent,
  brief: "Look for issues that have a label",
  finds: ["issue"],
  same: ["issue number"],
});
const withTrigger = (p: Playbook, t: Trigger, evaluated = true): Playbook => ({
  ...p,
  triggers: [...p.triggers, t],
  evals: evaluated
    ? [
        ...p.evals,
        {
          id: t.id,
          of: `triggers/${t.id}`,
          good: "It finds issues that were work",
          judge: "code",
          cases: [],
          line: { value: 50, unit: "percent" },
        },
      ]
    : p.evals,
  because: {
    ...p.because,
    [`triggers/${t.id}`]: { why: "my idea", where: "the template" },
    ...(evaluated ? { [`evals/${t.id}`]: { why: "my idea" as const, where: "the template" } } : {}),
  },
});
const fullAbove = (extra: Partial<Surroundings["above"]> = {}): Surroundings => ({ ...around, above: { ...around.above, ...extra } });
const github = (may: Record<string, "on" | "ask" | "off">, place = "*") => ({ account: "github", place, may });

describe("playbook: check, what is missing or too much", () => {
  it("rules:playbook/check-says-a-page-that-is-too-long", () => {
    const page = (n: number, end = "") => ({ ...repo(), page: Array.from({ length: n }, (_, i) => `Line ${i + 1}`).join("\n") + end });
    for (const p of [page(120), page(120, "\n"), page(1), page(0)]) expect(check(p)).toEqual([]);
    for (const n of [121, 122, 500]) expect(says(check(page(n)), "SKILL.md", "page", /120|page|lines?/iu), String(n)).toBe(true);
    // Empty lines are lines.
    expect(says(check({ ...repo(), page: `${"text\n".repeat(60)}${"\n".repeat(61)}x` }), "SKILL.md", "page", /120|page|lines?/iu)).toBe(
      true,
    );
    expect(check({ ...repo(), page: `${"text\n".repeat(60)}${"\n".repeat(59)}x` })).toEqual([]);
    expect(check(page(121)).filter((p) => p.line !== "page")).toEqual([]);
  });

  it("rules:playbook/check-says-a-cron-or-wait-with-no-limit", () => {
    expect(check(withTrigger(repo(), cron()))).toEqual([]);
    expect(check(withTrigger(repo(), cron({ a: "week", count: 1 }, "tells")))).toEqual([]);
    expect(check(withTrigger(repo(), cron({ a: "day", count: 3 }, { kinds: "any" })))).toEqual([]);
    expect(says(check(withTrigger(repo(), cron("no limit"))), "triggers.yaml", "triggers/scan", /scan|limit/iu)).toBe(true);
    expect(says(check(withTrigger(repo(), cron(undefined, { kind: "ghostkind" }))), "triggers.yaml", "triggers/scan", /ghostkind/u)).toBe(
      true,
    );
    expect(says(check(withTrigger(repo(), cron(undefined, undefined, "ghost"))), "triggers.yaml", "triggers/scan", /ghost/u)).toBe(true);
    const quiet = (over: Partial<Trigger>) => ({
      ...customers(),
      triggers: customers().triggers.map((t) => (t.id === "quiet" ? ({ ...t, ...over } as Trigger) : t)),
    });
    expect(says(check(quiet({ atMost: "no limit" })), "triggers.yaml", "triggers/quiet", /quiet|limit/iu)).toBe(true);
    expect(says(check(quiet({ makes: { kind: "ghostkind" } })), "triggers.yaml", "triggers/quiet", /ghostkind/u)).toBe(true);
    expect(check(quiet({ atMost: { a: "week", count: 7 } }))).toEqual([]);
    // An event with no limit is as it is in the templates.
    expect(check(repo())).toEqual([]);
  });

  it("rules:playbook/check-says-a-part-without-an-eval", () => {
    const base = repo();
    const without = (...ids: string[]): Playbook => ({ ...base, evals: base.evals.filter((e) => !ids.includes(e.id)) });
    expect(says(check(without("bug-build")), "workflow.yaml", "workflow/bug/build", /build/u)).toBe(true);
    expect(says(check(without("feature-review")), "workflow.yaml", "workflow/feature/review", /review/u)).toBe(true);
    expect(says(check(without("doer")), "agents/doer.md", "agents/doer", /doer/u)).toBe(true);
    expect(says(check(without("this-repo")), "skills/this-repo/SKILL.md", "skills/this-repo", /this-repo/u)).toBe(true);
    expect(says(check(withTrigger(base, cron(), false)), "triggers.yaml", "triggers/scan", /scan/u)).toBe(true);
    const found = check(without("doer", "judge", "upkeep-check"));
    for (const line of ["agents/doer", "agents/judge", "workflow/upkeep/check"]) expect(found.some((p) => p.line === line)).toBe(true);
    // Which eval it is does not matter, and parts that need none have none.
    expect(
      check({
        ...base,
        evals: base.evals.map((e) => (e.id === "doer" ? { ...e, id: "something-else" } : e)),
        because: { ...base.because, "evals/something-else": { why: "my idea" } },
      }),
    ).toEqual([]);
    const own = { id: "voice", name: "Voice", layer: "playbook", says: "How we sound", from: "here" } as const;
    const withOwn = { ...base, skills: [...base.skills, own], because: { ...base.because, "skills/voice": { why: "my idea" as const } } };
    expect(check(withOwn)).toEqual([]);
    expect(check({ ...base, kinds: base.kinds.map((k) => ({ ...k, steps: k.steps.map((s) => s) })) })).toEqual([]);
  });

  it("rules:playbook/check-says-a-line-without-a-why", () => {
    for (const name of ["repo", "customers"] as const) {
      const p = playbookOf(name);
      const wanted = [...folder(name)["because.yaml"]!.matchAll(/^"([^"]+)":/gmu)].map((m) =>
        (m[1] ?? "").replace(/\{\{(repo|mailbox)\}\}/u, name === "repo" ? "acme/web" : "help@acme.test"),
      );
      const found = check({ ...p, because: {} });
      expect(found.map((x) => x.line).sort()).toEqual([...wanted].sort());
      for (const problem of found) {
        expect(problem.at).toBe("because.yaml");
        expect(plain(problem.says)).toBe(true);
      }
    }
    const p = repo();
    for (const line of [
      "page",
      "objective",
      "workflow/bug",
      "workflow/bug/build",
      "triggers/own",
      "agents/doer",
      "skills/this-repo",
      "reach/github/acme/web",
      "evals/bug-build",
    ]) {
      const { [line]: _gone, ...rest } = p.because;
      const found = check({ ...p, because: rest });
      expect(found, line).toHaveLength(1);
      expect(found[0]).toMatchObject({ at: "because.yaml", line });
    }
    expect(kindLines(p).every((l) => p.because[l] !== undefined)).toBe(true);
  });

  it("rules:playbook/check-says-what-is-wider-than-above", () => {
    const p = repo();
    const every = (extra: Record<string, "on" | "ask" | "off"> = {}) => ({ ...around.above.grants[0]!.may, ...extra });
    const wide = (a: Surroundings) => check(p, a);
    // Only read above: every other action of the kinds and of the reach is wider, said at both.
    const readOnly = wide(fullAbove({ grants: [github({ "github.read": "on" })] }));
    expect(says(readOnly, "workflow.yaml", "workflow/bug", /github\.push/u)).toBe(true);
    expect(says(readOnly, "reach.yaml", "reach/github/acme/web", /github\.push/u)).toBe(true);
    // Ask is less than on, off is less than ask, equal is fine.
    expect(
      says(
        wide(fullAbove({ grants: [github(every({ "github.comment": "ask" }))] })),
        "reach.yaml",
        "reach/github/acme/web",
        /github\.comment/u,
      ),
    ).toBe(true);
    expect(
      says(wide(fullAbove({ grants: [github(every({ "github.merge": "off" }))] })), "workflow.yaml", "workflow/bug", /github\.merge/u),
    ).toBe(true);
    expect(wide(fullAbove({ grants: [github(every({ "github.merge": "ask", "github.push": "on" }))] }))).toEqual([]);
    // A place or an account that is not above.
    expect(says(wide(fullAbove({ grants: [github(every(), "acme/api")] })), "reach.yaml", "reach/github/acme/web", /acme\/web/u)).toBe(
      true,
    );
    expect(says(wide(fullAbove({ grants: [around.above.grants[1]!] })), "reach.yaml", "reach/github/acme/web", /github/u)).toBe(true);
    expect(wide(fullAbove({ grants: [github(every(), "acme/web")] }))).toEqual([]);
    const star = { ...p, reach: { ...p.reach, grants: p.reach.grants.map((g) => ({ ...g, place: "*" })) } };
    expect(check(star, fullAbove({ grants: [github(every(), "acme/web")] })).some((x) => x.at === "reach.yaml" && /\*/u.test(x.says))).toBe(
      true,
    );
    // Limits, to the unit: one more is wider; equal is not; a limit above that is not there is no limit.
    const limits = { perWork: 10, perDay: 40, perMonth: 100, hours: 48, atOnce: 4 };
    expect(wide(fullAbove({ limits }))).toEqual([]);
    expect(
      says(wide(fullAbove({ limits: { ...limits, perWork: 9 } })), "reach.yaml", "reach/limits", /perWork|piece of work|\b10\b|\b9\b/iu),
    ).toBe(true);
    expect(
      says(wide(fullAbove({ limits: { ...limits, perWork: 9 } })), "workflow.yaml", "workflow/bug", /perWork|piece of work|\b10\b|\b9\b/iu),
    ).toBe(true);
    const atOnce = wide(fullAbove({ limits: { ...limits, atOnce: 2 } }));
    expect(says(atOnce, "reach.yaml", "reach/limits", /atOnce|at once|\b4\b|\b2\b/iu)).toBe(true);
    expect(says(atOnce, "workflow.yaml", "workflow/bug", /atOnce|at once|\b3\b|\b2\b/iu)).toBe(true);
    expect(atOnce.some((x) => x.line === "workflow/feature" || x.line === "workflow/upkeep")).toBe(false);
    expect(says(wide(fullAbove({ limits: { ...limits, hours: 24 } })), "workflow.yaml", "workflow/bug", /hours|\b48\b|\b24\b/iu)).toBe(
      true,
    );
    expect(wide(fullAbove({ limits: {} }))).toEqual([]);
    expect(wide(fullAbove({ limits: { hours: 1000 } }))).toEqual([]);
  });

  it("rules:playbook/check-says-every-problem-at-once", () => {
    let p = mapStep(repo(), "bug", "build", (s) => ({ ...s, skills: ["nope-skill"] }));
    p = { ...p, page: "line\n".repeat(130) };
    const { "agents/judge": _gone, ...because } = p.because;
    p = { ...p, because };
    p = withTrigger(p, cron("no limit"));
    p = { ...p, reach: { ...p.reach, limits: { ...p.reach.limits, atOnce: 1000 } } };
    const found = check(p);
    for (const [at, line, re] of [
      ["workflow.yaml", "workflow/bug/build", /nope-skill/u],
      ["SKILL.md", "page", /120|page|lines?/iu],
      ["because.yaml", "agents/judge", /judge/u],
      ["triggers.yaml", "triggers/scan", /scan|limit/iu],
      ["reach.yaml", "reach/limits", /atOnce|at once|1000/iu],
    ] as const)
      expect(says(found, at, line, re), line).toBe(true);
    expect(new Set(found.map((f) => `${f.at}:${f.line ?? ""}`)).size).toBe(found.length);
    for (const f of found) expect(plain(f.says)).toBe(true);
  });
});
