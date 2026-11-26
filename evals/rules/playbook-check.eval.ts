import { describe, expect, it } from "vitest";
import { playbooks } from "~/modules/playbook/service.ts";
import type { Playbook, Problem, Surroundings } from "~/modules/playbook/types.ts";
import { around, mapAgent, mapKind, mapStep, plain, playbookOf } from "./playbook-world.ts";

const repo = () => playbookOf("repo");
const customers = () => playbookOf("customers");
const check = (p: Playbook, a: Surroundings = around): readonly Problem[] => playbooks.check(p, a);
const says = (found: readonly Problem[], at: string, line: string, re: RegExp): boolean =>
  found.some((p) => p.at === at && p.line === line && re.test(p.says) && plain(p.says));

describe("playbook: check", () => {
  it("rules:playbook/check-passes-what-is-fine", () => {
    expect(check(repo())).toEqual([]);
    expect(check(customers())).toEqual([]);
    // It looks at what is around: take the account, a skill, a person, a tool or an event away and it says so, by name.
    const without = (over: Partial<Surroundings>, re: RegExp) => {
      const found = check(repo(), { ...around, ...over });
      expect(found.length).toBeGreaterThan(0);
      expect(found.some((p) => re.test(p.says))).toBe(true);
    };
    without({ accounts: around.accounts.filter((a) => a.id !== "github") }, /github/u);
    without({ skills: around.skills.filter((s) => s !== "review") }, /review/u);
    without({ people: ["bo"] }, /ama/u);
    without({ tools: around.tools.filter((t) => t !== "bash") }, /bash/u);
    without({ accounts: around.accounts.map((a) => ({ ...a, events: a.events.filter((e) => e !== "merged") })) }, /merged/u);
    without({ accounts: around.accounts.map((a) => ({ ...a, actions: a.actions.filter((x) => x !== "github.label") })) }, /github\.label/u);
  });

  it("rules:playbook/check-says-what-is-not-there", () => {
    const one = (p: Playbook) => p;
    const bad = { id: "nokind" };
    const table: readonly (readonly [string, Playbook, string, string, RegExp])[] = [
      [
        "a skill of a step",
        mapStep(repo(), "bug", "build", (s) => ({ ...s, skills: ["nope-skill"] })),
        "workflow.yaml",
        "workflow/bug/build",
        /nope-skill/u,
      ],
      [
        "an agent that does",
        mapStep(repo(), "bug", "build", (s) => ({ ...s, by: { agent: "ghost" } })),
        "workflow.yaml",
        "workflow/bug/build",
        /ghost/u,
      ],
      [
        "an agent that checks",
        mapStep(repo(), "bug", "build", (s) => ({ ...s, checkedBy: { agent: "ghost2" } })),
        "workflow.yaml",
        "workflow/bug/build",
        /ghost2/u,
      ],
      [
        "a person who does",
        mapStep(repo(), "bug", "build", (s) => ({ ...s, by: { person: "zed" } })),
        "workflow.yaml",
        "workflow/bug/build",
        /zed/u,
      ],
      [
        "a person who checks",
        mapStep(repo(), "bug", "check", (s) => ({ ...s, checkedBy: { person: "zed" } })),
        "workflow.yaml",
        "workflow/bug/check",
        /zed/u,
      ],
      [
        "a person who is asked",
        mapStep(repo(), "bug", "understand", (s) => ({ ...s, otherwise: { ask: "zed" } })),
        "workflow.yaml",
        "workflow/bug/understand",
        /zed/u,
      ],
      [
        "a person asked after going back",
        mapStep(repo(), "bug", "build", (s) => ({ ...s, otherwise: { back: "build", times: 2, then: { ask: "zed" } } })),
        "workflow.yaml",
        "workflow/bug/build",
        /zed/u,
      ],
      [
        "an account of a kind",
        mapKind(repo(), "bug", (k) => ({ ...k, may: [...k.may, { account: "crm", place: "x", may: { "crm.read": "on" } }] })),
        "workflow.yaml",
        "workflow/bug",
        /crm/u,
      ],
      [
        "an action of a kind",
        mapKind(repo(), "bug", (k) => ({ ...k, may: k.may.map((m) => ({ ...m, may: { ...m.may, "github.nuke": "ask" as const } })) })),
        "workflow.yaml",
        "workflow/bug",
        /github\.nuke/u,
      ],
      [
        "a skill that is used",
        { ...repo(), skills: [...repo().skills, { id: "ghostskill", name: "Ghost", layer: "craft", says: "Nothing", from: "library" }] },
        "skills.yaml",
        "skills/ghostskill",
        /ghostskill/u,
      ],
      [
        "a skill of an agent",
        mapAgent(repo(), "doer", (a) => ({ ...a, skills: [...a.skills, "nope"] })),
        "agents/doer.md",
        "agents/doer",
        /nope/u,
      ],
      [
        "a tool of an agent",
        mapAgent(repo(), "doer", (a) => ({ ...a, tools: [...a.tools, "teleport"] })),
        "agents/doer.md",
        "agents/doer",
        /teleport/u,
      ],
      [
        "an action as a tool",
        mapAgent(repo(), "doer", (a) => ({ ...a, tools: [...a.tools, "github.nuke"] })),
        "agents/doer.md",
        "agents/doer",
        /github\.nuke/u,
      ],
      [
        "a model that is not connected",
        mapAgent(repo(), "doer", (a) => ({ ...a, model: { connection: "ghostconn", model: "ghostmodel", thinking: "low" } })),
        "agents/doer.md",
        "agents/doer",
        /ghostconn|ghostmodel/u,
      ],
      [
        "a model of a connection that is there",
        mapAgent(repo(), "doer", (a) => ({ ...a, model: { connection: "anthropic", model: "nomodel", thinking: "low" } })),
        "agents/doer.md",
        "agents/doer",
        /nomodel/u,
      ],
      [
        "an event of an account",
        {
          ...repo(),
          triggers: repo().triggers.map((t) => (t.by === "event" && t.id === "issues" ? { ...t, events: [...t.events, "earthquake"] } : t)),
        },
        "triggers.yaml",
        "triggers/issues",
        /earthquake/u,
      ],
      [
        "an account of a trigger",
        { ...repo(), triggers: repo().triggers.map((t) => (t.by === "event" && t.id === "issues" ? { ...t, account: "crm" } : t)) },
        "triggers.yaml",
        "triggers/issues",
        /crm/u,
      ],
      [
        "a kind a trigger makes",
        { ...repo(), triggers: repo().triggers.map((t) => (t.id === "asked" ? { ...t, makes: { kind: bad.id } } : t)) },
        "triggers.yaml",
        "triggers/asked",
        /nokind/u,
      ],
      ["the owner", { ...repo(), objective: { ...repo().objective, owner: "zed" } }, "objective.yaml", "objective/owner", /zed/u],
      [
        "a person who says a measure",
        {
          ...repo(),
          objective: {
            ...repo().objective,
            measure: { ...repo().objective.measure, read: { from: "person", person: "zed", asks: "How many?" } },
          },
        },
        "objective.yaml",
        "objective/measure",
        /zed/u,
      ],
      [
        "an account a measure is read from",
        {
          ...repo(),
          objective: {
            ...repo().objective,
            measure: { ...repo().objective.measure, read: { from: "connector", account: "crm", query: "x" } },
          },
        },
        "objective.yaml",
        "objective/measure",
        /crm/u,
      ],
      [
        "a person who may ask",
        { ...repo(), reach: { ...repo().reach, mayAsk: repo().reach.mayAsk.map((r) => ({ ...r, listed: { who: ["bo", "zed"] } })) } },
        "reach.yaml",
        "reach/mayAsk/github/acme/web",
        /zed/u,
      ],
      [
        "a person who judges an eval",
        { ...repo(), evals: repo().evals.map((e) => (e.id === "playbook" ? { ...e, judge: { person: "zed" } } : e)) },
        "evals/playbook.yaml",
        "evals/playbook",
        /zed/u,
      ],
      [
        "an action of the reach",
        {
          ...repo(),
          reach: { ...repo().reach, grants: repo().reach.grants.map((g) => ({ ...g, may: { ...g.may, "github.nuke": "on" as const } })) },
        },
        "reach.yaml",
        "reach/github/acme/web",
        /github\.nuke/u,
      ],
    ];
    for (const [what, p, at, line, re] of table) expect(says(check(one(p)), at, line, re), what).toBe(true);
    // One fault, one problem.
    expect(check(table[0]![1])).toHaveLength(1);
    expect(check(table[1]![1])).toHaveLength(1);
    expect(check(table[10]![1])).toHaveLength(1);
  });
});
