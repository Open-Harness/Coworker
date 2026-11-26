import { describe, expect, it } from "vitest";
import { playbooks } from "~/modules/playbook/service.ts";
import { templates } from "~/modules/templates/service.ts";
import type { Files } from "~/modules/playbook/types.ts";
import type { Answers, Template } from "~/modules/templates/types.ts";
import { around, filledFiles, mustRead, plain, plainAnswers } from "./playbook-world.ts";

const secrets = [
  "ghp_0123456789abcdefghijklmnopqrstuvwxyz",
  "sk-ant-api03-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
  "xoxb-1234567890-abcdefghijkl",
  "AKIAIOSFODNN7EXAMPLE",
];
const leaks = ["acme/web", "rosalind", "nina", "anthropic-main", "opus", "Issue 12", "Issue 31", ...secrets];

/** A manager as it is after some use: its own repo, people, a model, cases, and secrets someone pasted in. */
function manager(): Files {
  const files: Record<string, string> = {
    ...filledFiles("repo", { ...plainAnswers.repo, owner: "rosalind", doer: "anthropic-main opus high" }),
  };
  const edit = (path: string, from: string | RegExp, to: string) => {
    const text = files[path];
    if (text === undefined || !(typeof from === "string" ? text.includes(from) : from.test(text)))
      throw new Error(`Fixture: ${path} has no ${String(from)}`);
    files[path] = text.replace(from, to);
  };
  edit("reach.yaml", "listed: { who: writers }", "listed: { who: [rosalind, nina] }");
  edit("reach.yaml", "never:\n", `never:\n  - Never print ${secrets[3]} anywhere\n`);
  edit("evals/bug-build.yaml", "cases: []", 'cases: ["Issue 12: login fails for the owner", "Issue 31: 500 on save"]');
  edit("skills/this-repo/SKILL.md", "Install:", `Deploy token ${secrets[0]}. Install:`);
  edit("agents/doer.md", "Read before you write.", `Read before you write. The vendor key is ${secrets[1]}.`);
  edit("SKILL.md", "## When the answer is no", `Chat token ${secrets[2]}.\n\n## When the answer is no`);
  return files;
}
const all = (files: Files) => Object.values(files).join("\n");
const saved = () => templates.saveAs({ id: "coding-mine", name: "Coding, my way", about: "How we take issues", files: manager() });

describe("templates: save as", () => {
  it("rules:templates/save-as-leaves-out-places-people-models-secrets-cases", () => {
    expect(mustRead(manager()).agents.find((a) => a.id === "doer")?.model).toMatchObject({ connection: "anthropic-main" });
    const { template, gone } = saved();
    expect(template).toMatchObject({
      id: "coding-mine",
      version: 1,
      name: "Coding, my way",
      about: "How we take issues",
      whose: "this workspace",
    });
    expect(template.needs).toContain("github");
    expect(template.files).not.toHaveProperty("template.yaml");
    for (const path of ["SKILL.md", "agents/doer.md", "evals/bug-build.yaml", "reach.yaml", "skills/this-repo/SKILL.md"])
      expect(Object.keys(template.files)).toContain(path);
    // Nothing of the manager is left: not in a file, not in what a blank asks or suggests.
    const everything = `${all(template.files)}\n${JSON.stringify(template.blanks)}\n${JSON.stringify(gone)}`;
    for (const leak of leaks) expect(everything, leak).not.toContain(leak);
    // Places and people became blanks; the model became a model blank that says inherit.
    const place = template.blanks.filter((b) => b.is.a === "place");
    expect(place).toHaveLength(1);
    expect(place[0]).toMatchObject({ is: { a: "place", connector: "github" }, best: null });
    expect(template.blanks.filter((b) => b.is.a === "person").length).toBeGreaterThanOrEqual(1);
    const doer = template.blanks.find((b) => b.is.a === "model" && b.is.agent === "doer");
    expect(doer?.best).toMatchObject({ value: "inherit" });
    for (const b of template.blanks.filter((x) => x.is.a === "model")) expect(b.best?.value).toBe("inherit");
    // Every blank is used, and every `{{id}}` is a blank.
    const ids = template.blanks.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    const used = new Set([...all(template.files).matchAll(/\{\{([A-Za-z0-9_]+)\}\}/gu)].map((m) => m[1]));
    expect([...used].sort()).toEqual([...ids].sort());
    // What was cut is said, by file, and never says what it cut.
    const at = (path: string) => gone.filter((g) => g.at === path);
    for (const path of ["evals/bug-build.yaml", "skills/this-repo/SKILL.md", "agents/doer.md", "SKILL.md", "reach.yaml"]) {
      expect(at(path).length, path).toBeGreaterThan(0);
      for (const g of at(path)) expect(plain(g.says)).toBe(true);
    }
    // What is not those is kept: the numbers, the steps, the words.
    const kept = mustRead(filledFiles("repo", { ...plainAnswers.repo, owner: "rosalind" }));
    const refilled = templates.fill(template, answersFor(template), around);
    expect(refilled._tag).toBe("Filled");
    const p = refilled._tag === "Filled" ? mustRead(refilled.files) : kept;
    expect(p.reach.limits).toEqual(kept.reach.limits);
    expect(p.kinds.map((k) => k.steps.map((s) => s.id))).toEqual(kept.kinds.map((k) => k.steps.map((s) => s.id)));
    expect(p.name).toBe("Coding");
    expect(saved()).toEqual(saved());
  });

  it("rules:templates/a-saved-template-fills-again-to-a-checked-playbook", () => {
    const { template } = saved();
    expect(templates.fill(template, {}, around)._tag).toBe("Blank");
    const said = templates.fill(template, answersFor(template), around);
    expect(said._tag).toBe("Filled");
    if (said._tag !== "Filled") return;
    expect(said.from).toEqual({ template: "coding-mine", version: 1 });
    const p = mustRead(said.files);
    expect(playbooks.check(p, around)).toEqual([]);
    expect(p.reach.grants[0]?.place).toBe("acme/api");
    expect(p.kinds.every((k) => k.may.every((m) => m.place === "acme/api"))).toBe(true);
    expect(Object.keys(p.because)).toContain("reach/github/acme/api");
    expect(p.evals).toHaveLength(17);
    for (const e of p.evals) expect(e.cases).toEqual([]);
    expect(p.agents.find((a) => a.id === "doer")?.model).toBe("inherit");
    expect(p.objective.owner).toBe("bo");
    for (const leak of leaks) expect(all(playbooks.write(p)), leak).not.toContain(leak);
    // Another place, another person: the same template makes another manager.
    const second = templates.fill(template, answersFor(template, "acme/docs", "nina2"), { ...around, people: [...around.people, "nina2"] });
    expect(second._tag === "Filled" && mustRead(second.files).reach.grants[0]?.place).toBe("acme/docs");
  });
});

/** Every place blank answered with a place, every person blank with a person: the rest is left to its best. */
function answersFor(template: Template, place = "acme/api", person = "bo"): Answers {
  return Object.fromEntries(
    template.blanks.flatMap((b) => (b.is.a === "place" ? [[b.id, place]] : b.is.a === "person" ? [[b.id, person]] : [])),
  );
}
