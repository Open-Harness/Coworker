import type { Playbook } from "~/modules/playbook/types.ts";
import { mapAgent, mapKind, mapStep } from "./playbook-world.ts";

/* Edits of the repo playbook that touch one place each; any two of them are about different lines. */

export type Edit = {
  readonly name: string;
  readonly make: (p: Playbook) => Playbook;
  /** The lines this edit may change. */
  readonly touches: (line: string) => boolean;
  /** The lines it must change. */
  readonly must: readonly string[];
};

const is =
  (...lines: string[]) =>
  (line: string) =>
    lines.includes(line);
const under = (prefix: string) => (line: string) => line === prefix || line.startsWith(`${prefix}/`);

/** Edits to the repo playbook that touch one place each; any two of them are about different lines. */
export const edits: readonly Edit[] = [
  {
    name: "told",
    make: (p) => mapAgent(p, "doer", (a) => ({ ...a, told: `${a.told} Never guess.` })),
    touches: is("agents/doer/told", "agents/doer"),
    must: ["agents/doer/told"],
  },
  {
    name: "does",
    make: (p) => mapStep(p, "bug", "build", (s) => ({ ...s, does: `${s.does} Keep it small.` })),
    touches: is("workflow/bug/build"),
    must: ["workflow/bug/build"],
  },
  { name: "look", make: (p) => mapKind(p, "bug", (k) => ({ ...k, look: "2d" })), touches: is("workflow/bug"), must: ["workflow/bug"] },
  {
    name: "only",
    make: (p) => ({ ...p, triggers: p.triggers.map((t) => (t.id === "issues" ? { ...t, only: "It is open, and has a label" } : t)) }),
    touches: is("triggers/issues"),
    must: ["triggers/issues"],
  },
  {
    name: "section",
    make: (p) => ({ ...p, page: p.page.replace("I work in a clone", "I work in a fresh clone") }),
    touches: (l) => l === "page" || l === "page/How I work",
    must: ["page/How I work"],
  },
  {
    name: "aim",
    make: (p) => ({ ...p, objective: { ...p.objective, aim: { value: 9, by: "2027-06-30" } } }),
    touches: is("objective", "objective/aim"),
    must: ["objective/aim"],
  },
  {
    name: "never",
    make: (p) => ({ ...p, reach: { ...p.reach, never: p.reach.never.map((n, i) => (i === 2 ? `${n}, ever` : n)) } }),
    touches: is("reach/never/3"),
    must: ["reach/never/3"],
  },
  {
    name: "eval line",
    make: (p) => ({ ...p, evals: p.evals.map((e) => (e.id === "bug-build" ? { ...e, line: { value: 80, unit: "percent" } } : e)) }),
    touches: is("evals/bug-build"),
    must: ["evals/bug-build"],
  },
  {
    name: "skill says",
    make: (p) => ({ ...p, skills: p.skills.map((s) => (s.id === "this-repo" ? { ...s, says: `${s.says}, and changed` } : s)) }),
    touches: is("skills/this-repo"),
    must: ["skills/this-repo"],
  },
  {
    name: "new step",
    make: (p) =>
      mapKind(p, "upkeep", (k) => ({
        ...k,
        steps: [
          ...k.steps,
          {
            id: "tidy",
            name: "Tidy",
            by: { agent: "doer" },
            does: "Remove what the change left behind.",
            skills: [],
            leaves: [{ id: "clean", says: "Nothing is left behind", by: "agent" }],
            checkedBy: { agent: "reviewer" },
            otherwise: { ask: "ama" },
          },
        ],
      })),
    touches: under("workflow/upkeep/tidy"),
    must: ["workflow/upkeep/tidy"],
  },
  {
    name: "no trigger",
    make: (p) => ({ ...p, triggers: p.triggers.filter((t) => t.id !== "own") }),
    touches: is("triggers/own"),
    must: ["triggers/own"],
  },
  {
    name: "new agent",
    make: (p) => ({
      ...p,
      agents: [
        ...p.agents,
        {
          id: "scribe",
          name: "Scribe",
          is: "Writes down what was done",
          told: "Say it in two lines.",
          skills: [],
          tools: ["note"],
          model: "inherit",
        },
      ],
    }),
    touches: under("agents/scribe"),
    must: ["agents/scribe"],
  },
  {
    name: "no eval",
    make: (p) => ({ ...p, evals: p.evals.filter((e) => e.id !== "doer") }),
    touches: is("evals/doer"),
    must: ["evals/doer"],
  },
  {
    name: "model",
    make: (p) => mapAgent(p, "doer", (a) => ({ ...a, model: { connection: "anthropic", model: "opus", thinking: "high" } })),
    touches: is("agents/doer/model", "agents/doer"),
    must: ["agents/doer/model"],
  },
  {
    name: "new section",
    make: (p) => ({ ...p, page: `${p.page.trimEnd()}\n\n## When it is quiet\n\nI wait.\n` }),
    touches: is("page", "page/When it is quiet", "page/What good looks like"),
    must: ["page/When it is quiet"],
  },
];
