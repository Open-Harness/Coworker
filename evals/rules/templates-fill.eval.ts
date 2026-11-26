import { describe, expect, it } from "vitest";
import { playbooks } from "~/modules/playbook/service.ts";
import { templates } from "~/modules/templates/service.ts";
import type { Files } from "~/modules/playbook/types.ts";
import type { Answers, Filled, Template } from "~/modules/templates/types.ts";
import { around, folder, mustRead, plain, plainAnswers, playbookOf, type TemplateName } from "./playbook-world.ts";

const read = (name: TemplateName): Template => {
  const said = templates.read(folder(name));
  if (said._tag !== "Template") throw new Error(`Expected a template: ${JSON.stringify(said.problems)}`);
  return said.template;
};
const fill = (name: TemplateName, answers: Answers, a = around): Filled => templates.fill(read(name), answers, a);
const filledFiles = (said: Filled): Files => {
  if (said._tag !== "Filled") throw new Error(`Expected files: ${JSON.stringify(said)}`);
  return said.files;
};
const minimal: Answers = { repo: "acme/web", owner: "ama" };

describe("templates: read", () => {
  it("rules:templates/reads-both-folders", () => {
    const repo = read("repo");
    expect(repo).toMatchObject({ id: "repo", version: 1, name: "Work on a repo", whose: "ours", needs: ["github"] });
    expect(repo.about).toContain("merged pull request");
    expect(repo.blanks.map((b) => b.id)).toEqual([
      "repo",
      "name",
      "owner",
      "label",
      "perWork",
      "perDay",
      "doer",
      "reviewer",
      "judge",
      "install",
      "test",
    ]);
    const blank = (id: string) => repo.blanks.find((b) => b.id === id);
    expect(blank("repo")).toEqual({ id: "repo", ask: "Which repo?", is: { a: "place", connector: "github" }, best: null });
    expect(blank("perWork")).toMatchObject({ is: { a: "number", unit: "dollars" }, best: { value: "10", from: "the template" } });
    expect(blank("doer")).toMatchObject({ is: { a: "model", agent: "doer" }, best: { value: "inherit", from: "the workspace" } });
    expect(blank("owner")).toMatchObject({ is: { a: "person" }, best: { value: "whoever makes it", from: "you" } });
    expect(blank("install")?.best).toEqual({ value: "", from: "the repo" });
    // The files are the playbook's, as they are: the blanks still in them, and template.yaml not one of them.
    const all = folder("repo");
    expect(Object.keys(repo.files).sort()).toEqual(
      Object.keys(all)
        .filter((f) => f !== "template.yaml")
        .sort(),
    );
    expect(repo.files["SKILL.md"]).toBe(all["SKILL.md"]);
    expect(repo.files["workflow.yaml"]).toContain('"{{perWork}}"');
    const customers = read("customers");
    expect(customers).toMatchObject({ id: "customers", needs: ["email"], whose: "ours" });
    expect(customers.blanks.map((b) => b.id)).toEqual(["mailbox", "name", "owner", "perWork", "perDay", "writer", "reader", "judge"]);
    expect(customers.blanks[0]).toMatchObject({ is: { a: "place", connector: "email" }, best: null });
  });

  it("rules:templates/read-says-what-is-wrong-with-a-template", () => {
    const base = folder("repo");
    const yamlOf = base["template.yaml"] ?? "";
    const swap = (from: string | RegExp, to: string): Files => ({ ...base, "template.yaml": yamlOf.replace(from, to) });
    const cases: readonly (readonly [string, Files, RegExp])[] = [
      ["a key that is not one", swap("version: 1", "version: 1\ncolour: red"), /colour/u],
      ["a key that is missing", swap(/^about: .*\n/mu, ""), /about/u],
      ["a whose that is not one", swap("whose: ours", "whose: mine"), /whose/u],
      ["a blank of no kind", swap("is: { a: place, connector: github }", "is: { a: colour }"), /repo|colour/u],
      [
        "a model blank with a best that is not inherit",
        swap(
          "best: { value: inherit, from: the workspace } }\n  - { id: reviewer",
          "best: { value: anthropic opus high, from: the workspace } }\n  - { id: reviewer",
        ),
        /doer/u,
      ],
      ["a model blank with no best", swap(/(id: doer, .*)best: \{ value: inherit, from: the workspace \}/u, "$1best: null"), /doer/u],
      ["a text blank with no best", swap(/(id: name, .*)best: \{ value: Coding, from: the template \}/u, "$1best: null"), /name/u],
      [
        "a blank twice",
        swap("  - { id: label,", "  - { id: owner, ask: Again?, is: { a: text }, best: { value: x, from: you } }\n  - { id: label,"),
        /owner/u,
      ],
      ["a file that is not yaml", swap("version: 1", "version: [1"), /./u],
    ];
    for (const [what, files, says] of cases) {
      const said = templates.read(files);
      expect(said._tag, what).toBe("Problems");
      if (said._tag !== "Problems") continue;
      expect(
        said.problems.some((p) => p.at === "template.yaml" && says.test(p.says) && plain(p.says)),
        what,
      ).toBe(true);
    }
    const { "template.yaml": _gone, ...without } = base;
    const missing = templates.read(without);
    expect(missing._tag === "Problems" && missing.problems.some((p) => p.at === "template.yaml")).toBe(true);
  });
});

describe("templates: fill", () => {
  it("rules:templates/fills-with-bests-and-answers", () => {
    // Only the place and the person: every other blank has an answer of its own.
    const mine = filledFiles(fill("repo", minimal));
    expect(mine).not.toHaveProperty("template.yaml");
    expect(Object.values(mine).some((text) => text.includes("{{"))).toBe(false);
    const p = mustRead(mine);
    expect(playbooks.check(p, around)).toEqual([]);
    expect(p.name).toBe("Coding");
    expect(p.kinds[0]?.limits.perWork).toBe(10);
    expect(p.reach.limits).toMatchObject({ perWork: 10, perDay: 40 });
    expect(p.page).toContain("`juno`");
    expect(p.kinds[0]?.steps[1]?.leaves[0]?.run).toBe("");
    expect(fill("repo", minimal)).toEqual(fill("repo", minimal));
    // Where it is from is kept: the template, and its version.
    const said = fill("repo", minimal);
    expect(said._tag === "Filled" && said.from).toEqual({ template: "repo", version: 1 });
    // The same answers as the hand-filled one are the same playbook.
    expect(mustRead(filledFiles(fill("repo", plainAnswers.repo)))).toEqual(playbookOf("repo"));
    expect(mustRead(filledFiles(fill("customers", plainAnswers.customers)))).toEqual(playbookOf("customers"));
    // Answers beat bests, and the place is everywhere the place is.
    const other = mustRead(
      filledFiles(
        fill("repo", {
          repo: "acme/api",
          owner: "bo",
          name: "Fixer",
          perWork: "7",
          perDay: "21",
          label: "fix",
          install: "npm ci",
          test: "npm test",
        }),
      ),
    );
    expect(other.name).toBe("Fixer");
    expect(other.reach.limits).toMatchObject({ perWork: 7, perDay: 21 });
    expect(other.kinds.every((k) => k.limits.perWork === 7)).toBe(true);
    expect(other.kinds.every((k) => k.may.every((m) => m.place === "acme/api"))).toBe(true);
    expect(other.triggers.flatMap((t) => (t.by === "event" ? [t.place] : []))).toEqual(["acme/api", "acme/api"]);
    expect(other.kinds[0]?.steps[1]?.leaves[0]?.run).toBe("npm test");
    expect(other.kinds[0]?.steps[1]?.otherwise).toMatchObject({ then: { ask: "bo" } });
    expect(other.objective.owner).toBe("bo");
    expect(other.skillFiles["skills/this-repo/SKILL.md"]).toContain("npm ci");
    expect(Object.keys(other.because)).toContain("reach/github/acme/api");
    expect(JSON.stringify(Object.values(playbooks.write(other)))).not.toContain("acme/web");
    // Then it is checked: a person who is not there, or an account that is not there, is a problem and not files.
    const zed = fill("repo", { repo: "acme/web", owner: "zed" });
    expect(zed._tag).toBe("Problems");
    expect(zed._tag === "Problems" && zed.problems.some((x) => /zed/u.test(x.says) && plain(x.says))).toBe(true);
    const noGithub = fill("repo", minimal, { ...around, accounts: around.accounts.filter((a) => a.id !== "github") });
    expect(noGithub._tag === "Problems" && noGithub.problems.some((x) => /github/u.test(x.says))).toBe(true);
    // Another template, another place: the mailbox.
    const support = mustRead(filledFiles(fill("customers", { mailbox: "help@acme.test", owner: "ama" })));
    expect(support.kinds[0]?.limits.perWork).toBe(2);
    expect(support.reach.limits).toMatchObject({ perWork: 2, perDay: 20 });
    expect(playbooks.check(support, around)).toEqual([]);
  });

  it("rules:templates/number-blanks-lose-their-quotes", () => {
    const p = mustRead(filledFiles(fill("repo", { ...minimal, perWork: "12", perDay: "2.5" })));
    expect(p.kinds.map((k) => k.limits.perWork)).toEqual([12, 12, 12]);
    expect(p.reach.limits.perWork).toBe(12);
    expect(p.reach.limits.perDay).toBe(2.5);
    expect(mustRead(filledFiles(fill("repo", { ...minimal, perWork: "0" }))).reach.limits.perWork).toBe(0);
    // A text that looks like a number is still text.
    const text = mustRead(filledFiles(fill("repo", { ...minimal, name: "10", test: "007", label: "1e3" })));
    expect(text.name).toBe("10");
    expect(text.kinds[0]?.steps[1]?.leaves[0]?.run).toBe("007");
    expect(text.page).toContain("`1e3`");
    // What is not a number is not made into one.
    for (const bad of ["ten", "", " ", "1e", "10 dollars", "NaN", "Infinity", "1,5", "5; evil: x"]) {
      const said = fill("repo", { ...minimal, perWork: bad });
      expect(said._tag, JSON.stringify(bad)).toBe("Problems");
      expect(
        said._tag === "Problems" && said.problems.some((x) => /perWork|number/iu.test(x.says) && plain(x.says)),
        JSON.stringify(bad),
      ).toBe(true);
    }
  });

  it("rules:templates/model-blanks-become-the-model-or-inherit", () => {
    const p = mustRead(filledFiles(fill("repo", { ...minimal, doer: "anthropic opus high", judge: "anthropic haiku off" })));
    const model = (id: string) => p.agents.find((a) => a.id === id)?.model;
    expect(model("doer")).toEqual({ connection: "anthropic", model: "opus", thinking: "high" });
    expect(model("judge")).toEqual({ connection: "anthropic", model: "haiku", thinking: "off" });
    expect(model("reviewer")).toBe("inherit");
    expect(mustRead(filledFiles(fill("repo", { ...minimal, doer: "inherit" }))).agents.find((a) => a.id === "doer")?.model).toBe("inherit");
    // Not a model answer: the blank is named.
    for (const bad of ["anthropic opus", "anthropic opus extreme", "", "a b c d", "opus"]) {
      const said = fill("repo", { ...minimal, doer: bad });
      expect(said._tag, JSON.stringify(bad)).toBe("Problems");
      expect(said._tag === "Problems" && said.problems.some((x) => /doer/u.test(x.says) && plain(x.says)), JSON.stringify(bad)).toBe(true);
    }
    // A model that is not connected is the check's to say, by its name.
    const unknown = fill("repo", { ...minimal, reviewer: "acme gpt-9 low" });
    expect(unknown._tag === "Problems" && unknown.problems.some((x) => x.line === "agents/reviewer" && /gpt-9|acme/u.test(x.says))).toBe(
      true,
    );
    // Two managers from one template, on one repo, with other models: each its own.
    const a = mustRead(filledFiles(fill("repo", { ...minimal, doer: "anthropic opus high" })));
    const b = mustRead(filledFiles(fill("repo", { ...minimal, doer: "anthropic haiku low" })));
    expect(a.agents.find((x) => x.id === "doer")?.model).not.toEqual(b.agents.find((x) => x.id === "doer")?.model);
  });
});
