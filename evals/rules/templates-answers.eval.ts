import { describe, expect, it } from "vitest";
import { templates } from "~/modules/templates/service.ts";
import type { Files } from "~/modules/playbook/types.ts";
import type { Answers, Filled, Template } from "~/modules/templates/types.ts";
import { around, folder, mustRead, plainAnswers, type TemplateName } from "./playbook-world.ts";

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

/** What a playbook is made of, without what is said: keys, list lengths, kinds of value. */
function shape(value: unknown, key = ""): unknown {
  if (Array.isArray(value)) return value.map((v) => shape(v));
  if (typeof value === "object" && value !== null)
    return key === "because" ? Object.keys(value).length : Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v, k)]));
  return typeof value;
}

describe("templates: blanks and answers", () => {
  it("rules:templates/says-which-blanks-are-left", () => {
    expect(fill("repo", {})).toEqual({ _tag: "Blank", blanks: ["repo"] });
    expect(fill("repo", { owner: "ama", perWork: "3" })).toEqual({ _tag: "Blank", blanks: ["repo"] });
    expect(fill("customers", {})).toEqual({ _tag: "Blank", blanks: ["mailbox"] });
    const t = read("repo");
    const more: Template = {
      ...t,
      blanks: [
        ...t.blanks,
        { id: "second", ask: "Which other repo?", is: { a: "place", connector: "github" }, best: null },
        { id: "third", ask: "And?", is: { a: "place", connector: "github" }, best: null },
      ],
    };
    expect(templates.fill(more, {}, around)).toEqual({ _tag: "Blank", blanks: ["repo", "second", "third"] });
    expect(templates.fill(more, { third: "acme/x" }, around)).toEqual({ _tag: "Blank", blanks: ["repo", "second"] });
    expect(templates.fill(more, { repo: "acme/web", second: "acme/api", third: "acme/x", owner: "ama" }, around)._tag).toBe("Filled");
  });

  it("rules:templates/an-answer-adds-no-line-or-key", () => {
    const baseline = shape(mustRead(filledFiles(fill("repo", plainAnswers.repo))));
    const single = [
      'x" , evil: "y',
      "a: b",
      "# not a comment",
      "*alias",
      "&anchor x",
      "!!str tag",
      "{{owner}}",
      "---",
      "'single'",
      "back\\slash",
      "[a, b]",
      "- item",
      ": colon",
      "x }",
      "%percent",
      "tab\there",
      "ünïcödé ✓",
    ];
    const several = ['x\nowner: "evil"', "x\n---\nname: y", 'x"\nowner: "evil"\n"', "x\n\n## A heading\n\nmore"];
    const plan: readonly (readonly [string, readonly string[]])[] = [
      ["name", [...single.filter((_, i) => i % 2 === 0), ...several.slice(0, 2)]],
      ["test", [...single.filter((_, i) => i % 3 === 1), ...several]],
      ["repo", single.slice(0, 4)],
      ["label", [single[6] ?? "", ...several.slice(2)]],
      ["install", single.slice(5, 8)],
    ];
    for (const [id, texts] of plan)
      for (const text of texts) {
        const said = fill("repo", { ...plainAnswers.repo, [id]: text });
        if (said._tag === "Problems") {
          // Refusing it is fine for text that is not one line; for one line it is only text.
          expect(single, `${id} ${JSON.stringify(text)}`).not.toContain(text);
          continue;
        }
        expect(said._tag, `${id} ${JSON.stringify(text)}`).toBe("Filled");
        const p = mustRead(filledFiles(said));
        expect(shape(p), `${id} ${JSON.stringify(text)}`).toEqual(baseline);
        expect(p.objective.owner).toBe("ama");
        expect(p.reach.never).toHaveLength(4);
        if (single.includes(text) && id === "test") expect(p.kinds[0]?.steps[1]?.leaves[0]?.run).toBe(text);
        if (single.includes(text) && id === "name") expect(p.name).toBe(text);
        if (single.includes(text) && id === "repo") expect(p.reach.grants[0]?.place).toBe(text);
      }
    // An answer is put in as it was said: it is not read again for blanks of its own.
    const literal = mustRead(filledFiles(fill("repo", { ...plainAnswers.repo, label: "{{owner}}" })));
    expect(literal.page).toContain("`{{owner}}`");
    expect(literal.objective.owner).toBe("ama");
  });
});
