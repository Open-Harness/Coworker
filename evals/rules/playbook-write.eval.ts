import { describe, expect, it } from "vitest";
import { playbooks } from "~/modules/playbook/service.ts";
import type { Playbook } from "~/modules/playbook/types.ts";
import { mapAgent, mapKind, mapStep, playbookOf } from "./playbook-world.ts";

const awkward = [
  "",
  " ",
  "  leading and trailing  ",
  "null",
  "~",
  "true",
  "no",
  "123",
  "1e3",
  "- dash",
  "key: value",
  "# not a comment",
  '"double"',
  "back\\slash",
  "line one\nline two",
  "\nstarts with a newline",
  "ends with a newline\n",
  "\n\n",
  "---",
  "---\nname: x\n---",
  "{{owner}}",
  "*alias",
  "&anchor",
  "!!str tag",
  "@at",
  "[a, b]",
  "ünïcödé — ✓ 日本語 😀",
  "a: b\nc: d",
  "end: |\n  x",
  "## A heading inside",
  "x".repeat(5000),
];

/** The free text of a playbook set to `s` everywhere text may be; ids and the names of files stay. */
function withText(p: Playbook, s: string): Playbook {
  const measure = { ...p.objective.measure, counts: s, unit: s, read: { from: "connector", account: "github", query: s } as const };
  let q: Playbook = {
    ...p,
    name: s,
    page: s,
    objective: {
      ...p.objective,
      said: s,
      measure,
      notWorse: p.objective.notWorse.map((n) => ({ ...n, measure: { ...n.measure, counts: s } })),
    },
    reach: { ...p.reach, never: [s, "second"] },
    skills: p.skills.map((k) => ({ ...k, name: s, says: s })),
    evals: p.evals.map((e) => ({ ...e, good: s, cases: ["first", s], line: { ...e.line, unit: s } })),
    because: Object.fromEntries(Object.entries(p.because).map(([line, b]) => [line, { ...b, where: s }])),
  };
  q = mapAgent(q, "doer", (a) => ({ ...a, name: s, is: s, told: s }));
  q = mapAgent(q, "judge", (a) => ({ ...a, told: `${s}\n\n${s}` }));
  q = mapKind(q, "bug", (k) => ({
    ...k,
    name: s,
    when: s,
    doneWhen: k.doneWhen.map((c) => ({ ...c, says: s })),
  }));
  return mapStep(q, "bug", "build", (st) => ({
    ...st,
    name: s,
    does: s,
    leaves: st.leaves.map((c) => ({ ...c, says: s, run: s })),
    otherwise: { back: "build", times: 2, then: { drop: s } },
  }));
}

describe("playbook: write", () => {
  it("rules:playbook/write-reads-back-the-same", () => {
    for (const name of ["repo", "customers"] as const) {
      const p = playbookOf(name);
      const files = playbooks.write(p);
      for (const path of ["SKILL.md", "objective.yaml", "workflow.yaml", "triggers.yaml", "skills.yaml", "reach.yaml", "because.yaml"])
        expect(Object.keys(files)).toContain(path);
      expect(Object.keys(files)).not.toContain("template.yaml");
      expect(Object.keys(files).filter((f) => f.startsWith("evals/"))).toHaveLength(p.evals.length);
      expect(
        Object.keys(files)
          .filter((f) => f.startsWith("agents/"))
          .sort(),
      ).toEqual(p.agents.map((a) => `agents/${a.id}.md`).sort());
      expect(Object.keys(files).filter((f) => /^skills\/.+\/SKILL\.md$/u.test(f))).toHaveLength(
        p.skills.filter((s) => s.from === "here").length,
      );
      expect(playbooks.read(files)).toEqual({ _tag: "Playbook", playbook: p });
      // Writing is pure and settled: the same twice, and a second round trip changes nothing.
      expect(playbooks.write(p)).toEqual(files);
    }
    const repo = playbookOf("repo");
    const bare: Playbook = { ...repo, agents: [], skills: [], evals: [], because: {}, skillFiles: {} };
    expect(playbooks.read(playbooks.write(bare))).toEqual({ _tag: "Playbook", playbook: bare });
    // Reading what was written and writing it again gives the same files, byte for byte.
    const again = playbooks.read(playbooks.write(repo));
    expect(again._tag === "Playbook" && playbooks.write(again.playbook)).toEqual(playbooks.write(repo));
  });

  it("rules:playbook/write-keeps-awkward-text", () => {
    const repo = playbookOf("repo");
    for (const s of awkward) {
      const p = withText(repo, s);
      const read = playbooks.read(playbooks.write(p));
      expect(read, JSON.stringify(s.slice(0, 40))).toEqual({ _tag: "Playbook", playbook: p });
    }
    // Numbers keep their value, and a text that looks like one stays text.
    for (const value of [0, 0.1, -3, 5, 40, 1e21, 123456789012]) {
      const p: Playbook = { ...repo, objective: { ...repo.objective, aim: { value, by: "2027-02-28" } } };
      expect(playbooks.read(playbooks.write(p))).toEqual({ _tag: "Playbook", playbook: p });
    }
    const p2: Playbook = { ...repo, objective: { ...repo.objective, aim: { value: 5, by: "2027-02-28" }, owner: "007" } };
    expect(playbooks.read(playbooks.write(p2))).toEqual({ _tag: "Playbook", playbook: p2 });
  });
});
