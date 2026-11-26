import { describe, expect, it } from "vitest";
import { playbooks } from "~/modules/playbook/service.ts";
import { templates } from "~/modules/templates/service.ts";
import type { Files, Playbook } from "~/modules/playbook/types.ts";
import type { Copy, Template } from "~/modules/templates/types.ts";
import { filledFiles, folder, mapAgent, mapKind, mapStep, mustRead, plainAnswers } from "./playbook-world.ts";

const mine = (): Template => {
  const said = templates.read(folder("repo"));
  if (said._tag !== "Template") throw new Error("Expected a template");
  return said.template;
};
/** The template in its next version, with edits to its files as text. */
function next(edits: readonly (readonly [string, string, string])[], version = 2, drop: readonly string[] = [], add: Files = {}): Template {
  const t = mine();
  const files: Record<string, string> = { ...t.files, ...add };
  for (const [path, from, to] of edits) {
    const text = files[path];
    if (text === undefined || !text.includes(from)) throw new Error(`Fixture: ${path} has no ${from}`);
    files[path] = text.replace(from, to);
  }
  for (const d of drop) delete files[d];
  return { ...t, version, files };
}
const intro = [
  "SKILL.md",
  "to a merged pull request, or to an honest no.",
  "to a merged pull request, or to an honest no. Slowly, with care.",
] as const;
const build = [
  "workflow.yaml",
  "with a test that fails without it. Run what the repo runs.",
  "with a test that fails without it. Run what the repo runs, and say how you know.",
] as const;
const hours = [
  "workflow.yaml",
  'limits: { perWork: "{{perWork}}", hours: 48, atOnce: 3 }',
  'limits: { perWork: "{{perWork}}", hours: 72, atOnce: 3 }',
] as const;

/** The manager as given: its place, its owner, a model of its own. */
const given = (): Files => filledFiles("repo", { ...plainAnswers.repo, doer: "anthropic opus high" });
const copyOf = (now: Files = given(), version = 1): Copy => ({ template: "repo", version, given: given(), now });
const lines = (said: ReturnType<typeof templates.newer>) => (said._tag === "Suggestion" ? said.changes.map((c) => c.line).sort() : []);

/** What the manager's playbook becomes when the three edits above are taken on. */
function withTemplateEdits(p: Playbook): Playbook {
  const q = { ...p, page: p.page.replace("or to an honest no.", "or to an honest no. Slowly, with care.") };
  let r = mapKind(q, "bug", (k) => ({ ...k, limits: { ...k.limits, hours: 72 } }));
  for (const k of ["bug", "feature", "upkeep"])
    r = mapStep(r, k, "build", (s) => ({ ...s, does: `${s.does}, and say how you know.`.replace(".,", ",") }));
  return r;
}

describe("templates: newer", () => {
  it("rules:templates/newer-says-nothing-when-nothing-is-newer", () => {
    const t = next([intro]);
    expect(templates.newer(copyOf(), { ...t, version: 1 })).toEqual({ _tag: "Same" });
    expect(templates.newer(copyOf(), { ...t, version: 0 })).toEqual({ _tag: "Same" });
    expect(templates.newer(copyOf(undefined, 3), t)).toEqual({ _tag: "Same" });
    // A newer version that is the same in effect: the blanks are the manager's, they are not changes.
    expect(templates.newer(copyOf(), next([], 2))).toEqual({ _tag: "Same" });
    // The manager took the change by hand already.
    const hand = mustRead(given());
    const taken = playbooks.write({ ...hand, page: hand.page.replace("or to an honest no.", "or to an honest no. Slowly, with care.") });
    expect(templates.newer(copyOf(taken), t)).toEqual({ _tag: "Same" });
  });

  it("rules:templates/newer-is-a-suggestion-and-keeps-what-the-manager-changed", () => {
    const t = next([intro, build, hours]);
    const said = templates.newer(copyOf(), t);
    expect(said._tag).toBe("Suggestion");
    if (said._tag !== "Suggestion") return;
    expect(said.version).toBe(2);
    expect(said.clashes).toEqual([]);
    expect(lines(said)).toEqual(["page", "workflow/bug", "workflow/bug/build", "workflow/feature/build", "workflow/upkeep/build"]);
    const text = (line: string) => said.changes.find((c) => c.line === line);
    // It says what was and what it becomes, with the manager's own place, number and model in it, never a blank.
    for (const c of said.changes) {
      expect(c.was).not.toBeNull();
      expect(c.becomes).not.toBeNull();
      expect(c.becomes ?? "").not.toContain("{{");
      expect(c.was).not.toBe(c.becomes);
    }
    expect(text("page")?.becomes).toContain("acme/web");
    expect(text("page")?.becomes).toContain("Slowly, with care");
    expect(text("page")?.was).not.toContain("Slowly");
    expect(text("workflow/bug")?.was).toContain("48");
    expect(text("workflow/bug")?.becomes).toContain("72");
    expect(text("workflow/bug")?.becomes).toContain("10");
    expect(text("workflow/feature/build")?.becomes).toContain("say how you know");
    // Taking it on gives the playbook with the edits, and nothing else.
    const p = mustRead(given());
    expect(playbooks.apply(given(), said.changes)).toEqual({ _tag: "Playbook", playbook: withTemplateEdits(p) });
    // The manager changed other things itself: those are kept, and are not in what is suggested.
    const own = mapAgent(p, "doer", (a) => ({ ...a, told: `${a.told} Never guess.` }));
    const scribe = {
      ...own,
      evals: own.evals.filter((e) => e.id !== "judge"),
      agents: [
        ...own.agents,
        {
          id: "scribe",
          name: "Scribe",
          is: "Writes down what was done",
          told: "In two lines.",
          skills: [],
          tools: ["note"],
          model: "inherit" as const,
        },
      ],
    };
    const now = playbooks.write(scribe);
    const again = templates.newer(copyOf(now), t);
    expect(lines(again)).toEqual(lines(said));
    expect(again._tag === "Suggestion" && again.clashes).toEqual([]);
    if (again._tag === "Suggestion")
      expect(playbooks.apply(now, again.changes)).toEqual({ _tag: "Playbook", playbook: withTemplateEdits(scribe) });
    // A line the template added is new here, and one it removed goes, if the manager left it alone.
    const grown = next([], 2, ["evals/this-repo.yaml"], {
      "agents/scribe.md":
        "---\nname: Scribe\nis: Writes down what was done\nskills: []\ntools: [note]\nmodel: inherit\n---\n\nIn two lines.\n",
    });
    const grownSaid = templates.newer(copyOf(), grown);
    const byLine = new Map((grownSaid._tag === "Suggestion" ? grownSaid.changes : []).map((c) => [c.line, c]));
    expect(byLine.get("agents/scribe")).toMatchObject({ was: null });
    expect(byLine.get("evals/this-repo")?.becomes).toBeNull();
    expect(byLine.get("evals/this-repo")?.was).toContain("More pass with it than without");
  });

  it("rules:templates/newer-shows-both-when-both-changed-a-line", () => {
    const t = next([intro, build]);
    const p = mustRead(given());
    const yours = { ...p, page: p.page.replace("or to an honest no.", "or to an honest no, quietly.") };
    const now = playbooks.write(yours);
    const said = templates.newer(copyOf(now), t);
    expect(said._tag).toBe("Suggestion");
    if (said._tag !== "Suggestion") return;
    const page = said.clashes.find((c) => c.line === "page");
    expect(said.clashes).toHaveLength(1);
    expect(page?.base).toContain("to an honest no.");
    expect(page?.base).not.toContain("quietly");
    expect(page?.theirs).toContain("Slowly, with care");
    expect(page?.theirs).toContain("acme/web");
    expect(page?.theirs ?? "").not.toContain("{{");
    expect(page?.yours).toContain("quietly");
    // The clash is not also a change, and the rest still is.
    expect(lines(said)).toEqual(["workflow/bug/build", "workflow/feature/build", "workflow/upkeep/build"]);
    expect(said.changes.some((c) => c.line === "page")).toBe(false);
    // Taking on the changes leaves the manager's own words where they clash.
    const taken = playbooks.apply(now, said.changes);
    expect(taken._tag).toBe("Playbook");
    if (taken._tag === "Playbook") expect(taken.playbook.page).toContain("quietly");
    // The template removed what the manager changed: both are shown, and nothing is lost.
    const dropped = next([], 2, ["evals/this-repo.yaml"]);
    const edited = {
      ...p,
      evals: p.evals.map((e) => (e.id === "this-repo" ? { ...e, good: "More pass with it than without, on our repo" } : e)),
    };
    const gone = templates.newer(copyOf(playbooks.write(edited)), dropped);
    expect(
      gone._tag === "Suggestion" && gone.clashes.map((c) => [c.line, c.theirs === null, (c.yours ?? "").includes("on our repo")]),
    ).toEqual([["evals/this-repo", true, true]]);
    expect(gone._tag === "Suggestion" && gone.changes).toEqual([]);
    // Nothing is a clash when only the manager changed it, or when both made the same change.
    const same = templates.newer(
      copyOf(playbooks.write({ ...p, page: p.page.replace("or to an honest no.", "or to an honest no. Slowly, with care.") })),
      next([intro, build]),
    );
    expect(same._tag === "Suggestion" && same.clashes).toEqual([]);
  });
});
