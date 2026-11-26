import { describe, expect, it } from "vitest";
import { playbooks } from "~/modules/playbook/service.ts";
import type { Files, Problem } from "~/modules/playbook/types.ts";
import { filledFiles, folder, plain, playbookOf } from "./playbook-world.ts";

const problemsOf = (files: Files): readonly Problem[] => {
  const said = playbooks.read(files);
  if (said._tag !== "Problems") throw new Error("Expected problems, got a playbook");
  return said.problems;
};
const swap = (files: Files, path: string, from: string | RegExp, to: string): Files => {
  const text = files[path];
  if (text === undefined || !(typeof from === "string" ? text.includes(from) : from.test(text)))
    throw new Error(`Fixture: ${path} has no ${String(from)}`);
  return { ...files, [path]: text.replace(from, to) };
};
const named = (found: readonly Problem[], at: string, line: string | undefined, says: RegExp) =>
  found.some((p) => p.at === at && (line === undefined || p.line === line) && says.test(p.says));

describe("playbook: read", () => {
  it("rules:playbook/reads-both-templates", () => {
    const repo = playbookOf("repo");
    expect(repo.name).toBe("Coding");
    expect(repo.page).toContain("## How I work");
    expect(repo.page).toContain("**acme/web**");
    expect(repo.page).not.toMatch(/^---/u);
    expect(repo.page).not.toContain("name: ");
    expect(repo.kinds.map((k) => k.id)).toEqual(["bug", "feature", "upkeep"]);
    // The file says the steps once and points to them; each kind has all four, as its own value.
    for (const k of repo.kinds) expect(k.steps.map((s) => s.id)).toEqual(["understand", "build", "check", "review"]);
    const [bug, feature, upkeep] = repo.kinds;
    expect(bug?.limits).toEqual({ perWork: 10, hours: 48, atOnce: 3 });
    expect(feature?.limits).toEqual({ perWork: 10, hours: 48, atOnce: 2 });
    expect(upkeep).toMatchObject({ alone: "watch", look: "2d", limits: { perWork: 10, hours: 24, atOnce: 1 } });
    expect(bug?.may[0]).toMatchObject({ account: "github", place: "acme/web" });
    expect(bug?.may[0]?.may).toMatchObject({ "github.read": "on", "github.rerun_checks": "ask", "github.merge": "ask" });
    expect(bug?.steps[1]).toEqual({
      id: "build",
      name: "Build",
      by: { agent: "doer" },
      does: expect.stringContaining("Make the change in the clone"),
      skills: ["this-repo"],
      leaves: [{ id: "tests", says: "The repo's own tests pass", by: "command", run: "pnpm test" }],
      checkedBy: { code: true },
      otherwise: { back: "build", times: 2, then: { ask: "ama" } },
    });
    expect(bug?.steps[3]).toMatchObject({ by: { manager: true }, otherwise: { drop: "The pull request was closed" } });
    expect(bug?.doneWhen.map((c) => c.id)).toEqual(["fixed", "closed"]);
    expect(repo.objective).toMatchObject({
      measure: {
        better: "more",
        unit: "a week",
        settles: "14d",
        read: { from: "connector", account: "github", query: "fixed-and-stayed acme/web 14d" },
        before: { unknown: expect.stringContaining("90 days") },
      },
      aim: { value: 5, by: "2027-02-28" },
      owner: "ama",
    });
    expect(repo.objective.notWorse.map((n) => n.limit)).toEqual([15, 1]);
    expect(repo.triggers.map((t) => t.id)).toEqual(["issues", "own", "asked"]);
    expect(repo.triggers[0]).toMatchObject({
      by: "event",
      on: true,
      account: "github",
      place: "acme/web",
      atMost: "no limit",
      makes: { kinds: "any" },
      events: ["issue", "label", "comment"],
    });
    expect(repo.triggers[1]).toMatchObject({ makes: "tells", by: "event" });
    expect(repo.triggers[2]).toMatchObject({ by: "asked", where: "chat" });
    expect(repo.agents.map((a) => a.id).sort()).toEqual(["doer", "judge", "reviewer"]);
    expect(repo.agents.find((a) => a.id === "doer")).toMatchObject({
      name: "Doer",
      model: "inherit",
      skills: ["this-repo", "answer-a-review"],
    });
    expect(repo.agents.find((a) => a.id === "doer")?.tools).toContain("github.merge");
    expect(repo.agents.find((a) => a.id === "doer")?.told).toMatch(/^Read before you write\./u);
    expect(repo.skills.map((s) => s.id).sort()).toEqual(["answer-a-review", "github", "review", "this-repo", "untrusted", "work"]);
    expect(repo.skills.find((s) => s.id === "this-repo")).toMatchObject({ layer: "craft", from: "here" });
    expect(repo.skills.find((s) => s.id === "github")).toMatchObject({ layer: "connector", from: "connector" });
    expect(repo.reach.limits).toEqual({ perWork: 10, perDay: 40, atOnce: 4, hours: 48 });
    expect(repo.reach.grants[0]?.may["github.push"]).toBe("on");
    expect(repo.reach.mayAsk[0]).toMatchObject({
      account: "github",
      place: "acme/web",
      listed: { who: "writers" },
      others: "maybe",
      overheard: "maybe",
      bots: [],
    });
    expect(repo.reach.never).toHaveLength(4);
    expect(repo.evals).toHaveLength(17);
    expect(repo.evals.find((e) => e.id === "bug-build")).toEqual({
      id: "bug-build",
      of: "workflow/bug/build",
      good: "The change goes on the first time",
      judge: "code",
      cases: [],
      line: { value: 70, unit: "percent" },
    });
    expect(repo.evals.find((e) => e.id === "playbook")?.judge).toEqual({ person: "ama" });
    const keys = [...folder("repo")["because.yaml"]!.matchAll(/^"([^"]+)":/gmu)].map((m) => (m[1] ?? "").replace("{{repo}}", "acme/web"));
    expect(Object.keys(repo.because).sort()).toEqual(keys.sort());
    expect(repo.because["workflow/bug/build"]).toEqual({ why: "my idea", where: "the template" });

    const customers = playbookOf("customers");
    expect(customers.name).toBe("Support");
    expect(customers.kinds.map((k) => k.id)).toEqual(["question", "fault"]);
    expect(customers.kinds[0]?.steps.map((s) => s.id)).toEqual(["find", "write", "answer"]);
    expect(customers.kinds[0]?.steps[0]).toMatchObject({ checkedBy: { agent: "reader" }, skills: ["our-answers"] });
    expect(customers.kinds[1]?.steps[1]?.skills).toEqual([]);
    expect(customers.kinds[0]?.may[0]).toMatchObject({ account: "email", place: "help@acme.test" });
    expect(customers.kinds[0]?.may[0]?.may["email.send_outside"]).toBe("off");
    expect(customers.kinds[0]?.limits).toEqual({ perWork: 2, hours: 168, atOnce: 30 });
    expect(customers.triggers[1]).toMatchObject({
      by: "wait",
      for: "3d",
      holds: "We wrote last",
      account: "email",
      atMost: { a: "day", count: 50 },
      makes: "tells",
    });
    expect(customers.objective.notWorse[1]?.measure.read).toEqual({ from: "person", person: "ama", asks: "Was this answer right?" });
    expect(customers.skills.find((s) => s.id === "our-answers")).toMatchObject({ from: "here", layer: "craft" });
    expect(customers.reach.mayAsk[0]?.listed).toEqual({ who: "team" });
    expect(customers.evals).toHaveLength(11);
  });

  it("rules:playbook/says-every-problem-at-once", () => {
    let files = filledFiles("repo");
    files = swap(files, "objective.yaml", /^owner: .*$/mu, "aims: 3");
    files = swap(
      files,
      "triggers.yaml",
      "id: own, name: A pull request of mine, on: true",
      "id: own, name: A pull request of mine, on: sometimes",
    );
    files = { ...files, "reach.yaml": "grants: [\nlimits: {" };
    files = swap(files, "agents/doer.md", /^model: .*$/mu, "model: 7");
    files = swap(files, "workflow.yaml", /\s+checkedBy: \{ code: true \}\n(\s+otherwise: \{ back: build)/u, "\n$1");
    files = swap(files, "evals/bug-check.yaml", "judge: code", "judge: code\ncolour: red");
    files = swap(files, "because.yaml", '"page": { why: my idea', '"page": { why: i guess');
    files = swap(
      files,
      "skills.yaml",
      "id: review, name: Review a change, layer: craft",
      "id: review, name: Review a change, layer: magic",
    );
    files = swap(files, "SKILL.md", /^name: .*\n/mu, "");
    const found = problemsOf(files);
    expect(named(found, "objective.yaml", undefined, /aims/u)).toBe(true);
    expect(named(found, "objective.yaml", undefined, /owner/u)).toBe(true);
    expect(named(found, "triggers.yaml", "triggers/own", /\bon\b/u)).toBe(true);
    expect(found.some((p) => p.at === "reach.yaml")).toBe(true);
    expect(named(found, "agents/doer.md", "agents/doer", /model/u)).toBe(true);
    expect(named(found, "workflow.yaml", "workflow/bug/build", /checkedBy/u)).toBe(true);
    expect(named(found, "evals/bug-check.yaml", "evals/bug-check", /colour/u)).toBe(true);
    expect(named(found, "because.yaml", "page", /why/u)).toBe(true);
    expect(named(found, "skills.yaml", "skills/review", /layer/u)).toBe(true);
    expect(named(found, "SKILL.md", undefined, /name|front matter/iu)).toBe(true);
    // The files that are fine are not blamed, and every problem is a sentence.
    const blamed = new Set(found.map((p) => p.at));
    for (const fine of [
      "evals/bug-build.yaml",
      "agents/judge.md",
      "agents/reviewer.md",
      "skills/this-repo/SKILL.md",
      "evals/playbook.yaml",
    ])
      expect(blamed.has(fine)).toBe(false);
    for (const p of found) {
      expect(plain(p.says)).toBe(true);
      expect(Object.keys(files)).toContain(p.at);
    }
  });

  it("rules:playbook/says-a-file-that-is-missing", () => {
    const found = problemsOf({});
    for (const at of ["SKILL.md", "objective.yaml", "workflow.yaml", "triggers.yaml", "reach.yaml"])
      expect(found.some((p) => p.at === at)).toBe(true);
    const files = filledFiles("customers");
    for (const gone of ["objective.yaml", "workflow.yaml", "reach.yaml"]) {
      const { [gone]: _gone, ...rest } = files;
      const said = problemsOf(rest);
      expect(said.some((p) => p.at === gone && plain(p.says))).toBe(true);
      // The other files are still read: nothing else is blamed.
      expect(said.every((p) => p.at === gone)).toBe(true);
    }
  });
});
