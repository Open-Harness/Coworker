import { describe, expect, it } from "vitest";
import { playbooks } from "~/modules/playbook/service.ts";
import type { Change } from "~/modules/playbook/types.ts";
import { changedLines, filledFiles, mustRead, playbookOf, textOf } from "./playbook-world.ts";
import { edits } from "./playbook-edits.ts";

const repo = () => playbookOf("repo");
const index = (names: readonly string[], line: string) => {
  const at = names.indexOf(line);
  if (at < 0) throw new Error(`No line ${line}`);
  return at;
};
const byLine = (changes: readonly Change[]) => new Map(changes.map((c) => [c.line, c]));

describe("playbook: lines", () => {
  it("rules:playbook/lines-in-reading-order", () => {
    const p = repo();
    const all = playbooks.lines(p);
    const found = all.map((l) => l.line);
    expect(new Set(found).size).toBe(found.length);
    expect(playbooks.lines(p)).toEqual(all);
    for (const l of all) expect(typeof l.text).toBe("string");
    const required = [
      "page",
      "page/How I work",
      "page/When I stop and ask",
      "page/When the answer is no",
      "page/What good looks like",
      "objective/said",
      "objective/measure",
      "objective/aim",
      "objective/notWorse/1",
      "objective/notWorse/2",
      "objective/owner",
      "workflow/bug",
      "workflow/bug/understand",
      "workflow/bug/review",
      "workflow/upkeep/build",
      "triggers/issues",
      "triggers/own",
      "triggers/asked",
      "agents/doer",
      "agents/doer/told",
      "agents/doer/model",
      "agents/judge/told",
      "skills/this-repo",
      "skills/review",
      "reach/github/acme/web",
      "reach/limits",
      "reach/mayAsk/github/acme/web",
      "reach/never/1",
      "reach/never/4",
      "evals/bug-build",
      "evals/playbook",
    ];
    for (const line of required) expect(found, line).toContain(line);
    expect(found).not.toContain("reach/never/0");
    expect(found).not.toContain("reach/never/5");
    // What is said, as text: not empty, and the words that are in the playbook.
    const words: readonly (readonly [string, string])[] = [
      ["page", "Take issues on"],
      ["page/How I work", "Someone who can write to the repo asks"],
      ["objective/said", "Issues on acme/web get fixed"],
      ["agents/doer/told", "Read before you write"],
      ["workflow/bug/build", "Make the change in the clone"],
      ["triggers/issues", "An issue on acme/web"],
      ["skills/this-repo", "How this repo is installed"],
      ["reach/never/2", "Change anything under .github/workflows"],
      ["evals/bug-build", "The change goes on the first time"],
      ["reach/github/acme/web", "github.push"],
    ];
    for (const [line, text] of words) expect(textOf(p, line) ?? "", line).toContain(text);
    // Reading order: the page, the objective, the workflow, triggers, agents, skills, reach, evals; a kind before its steps.
    const first = (prefix: string) => found.findIndex((l) => l === prefix || l.startsWith(`${prefix}/`));
    const order = ["page", "objective", "workflow", "triggers", "agents", "skills", "reach", "evals"].map(first);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(new Set(order).size).toBe(order.length);
    expect(index(found, "workflow/bug")).toBeLessThan(index(found, "workflow/bug/understand"));
    expect(index(found, "workflow/bug/understand")).toBeLessThan(index(found, "workflow/bug/build"));
    expect(index(found, "workflow/bug/review")).toBeLessThan(index(found, "workflow/feature"));
    expect(index(found, "workflow/feature/review")).toBeLessThan(index(found, "workflow/upkeep"));
    expect(index(found, "page/How I work")).toBeLessThan(index(found, "page/When I stop and ask"));
    expect(index(found, "page/When the answer is no")).toBeLessThan(index(found, "page/What good looks like"));
    expect(index(found, "triggers/issues")).toBeLessThan(index(found, "triggers/asked"));
    expect(index(found, "reach/never/1")).toBeLessThan(index(found, "reach/never/4"));
    // Everything that needs a reason is a line, in both templates.
    for (const name of ["repo", "customers"] as const) {
      const lines = new Set(playbooks.lines(playbookOf(name)).map((l) => l.line));
      for (const key of Object.keys(playbookOf(name).because)) expect(lines.has(key), key).toBe(true);
    }
    expect(playbooks.lines({ ...p, page: "No sections here.\n" }).filter((l) => l.line.startsWith("page/"))).toEqual([]);
  });

  it("rules:playbook/lines-one-change-one-line", () => {
    const p = repo();
    expect(changedLines(p, p)).toEqual([]);
    for (const edit of edits) {
      const changed = changedLines(p, edit.make(p));
      expect(changed.length, edit.name).toBeGreaterThan(0);
      for (const line of edit.must) expect(changed, edit.name).toContain(line);
      for (const line of changed) expect(edit.touches(line), `${edit.name}: ${line}`).toBe(true);
    }
    // A kind without its steps, and one step: neither is the other.
    expect(changedLines(p, edits.find((e) => e.name === "does")!.make(p))).toEqual(["workflow/bug/build"]);
    expect(changedLines(p, edits.find((e) => e.name === "look")!.make(p))).toEqual(["workflow/bug"]);
    // Only the order of the files, or of how it is written, is no change.
    expect(changedLines(p, mustRead(playbooks.write(p)))).toEqual([]);
    expect(changedLines(p, mustRead(filledFiles("repo")))).toEqual([]);
  });
});

describe("playbook: diff and apply", () => {
  it("rules:playbook/diff-names-what-is-different", () => {
    const p = repo();
    const a = playbooks.write(p);
    expect(playbooks.diff(a, a)).toEqual([]);
    // The playbook as it was written by hand is the same playbook.
    expect(playbooks.diff(filledFiles("repo"), a)).toEqual([]);
    for (const edit of edits) {
      const q = edit.make(p);
      const b = playbooks.write(q);
      const changes = playbooks.diff(a, b);
      expect(changes.map((c) => c.line).sort(), edit.name).toEqual(changedLines(p, q));
      for (const c of changes) {
        expect(c.was, `${edit.name} ${c.line}`).toBe(textOf(p, c.line));
        expect(c.becomes, `${edit.name} ${c.line}`).toBe(textOf(q, c.line));
        expect(c.was).not.toBe(c.becomes);
      }
      // Back again says the same, the other way round.
      if (edit.name.length % 2 !== 0) continue;
      const back = byLine(playbooks.diff(b, a));
      expect(back.size).toBe(changes.length);
      for (const c of changes) expect(back.get(c.line)).toEqual({ line: c.line, was: c.becomes, becomes: c.was });
    }
    const added = byLine(playbooks.diff(a, playbooks.write(edits.find((e) => e.name === "new step")!.make(p))));
    expect(added.get("workflow/upkeep/tidy")).toMatchObject({ was: null });
    expect(added.get("workflow/upkeep/tidy")?.becomes).toContain("Remove what the change left behind");
    const removed = byLine(playbooks.diff(a, playbooks.write(edits.find((e) => e.name === "no trigger")!.make(p))));
    expect(removed.get("triggers/own")?.becomes).toBeNull();
    expect(removed.get("triggers/own")?.was).toContain("A pull request of mine");
    // Two edits at once: both are said.
    const both = edits[0]!.make(edits[1]!.make(p));
    expect(
      playbooks
        .diff(a, playbooks.write(both))
        .map((c) => c.line)
        .sort(),
    ).toEqual(changedLines(p, both));
  });

  it("rules:playbook/apply-makes-the-playbook-it-says", () => {
    const p = repo();
    const a = playbooks.write(p);
    expect(playbooks.apply(a, [])).toEqual({ _tag: "Playbook", playbook: p });
    for (const edit of edits) {
      const q = edit.make(p);
      const changes = playbooks.diff(a, playbooks.write(q));
      const expected = { _tag: "Playbook", playbook: mustRead(playbooks.write(q)) };
      expect(playbooks.apply(a, changes), edit.name).toEqual(expected);
      if (edit.name.length % 3 === 0) expect(playbooks.apply(a, [...changes].reverse()), edit.name).toEqual(expected);
    }
    // A suggestion lands on a playbook someone else changed elsewhere, and keeps their change.
    const edited = edits.map((e) => e.make(p));
    const written = edited.map((q) => playbooks.write(q));
    for (const [i, one] of edits.entries())
      for (const [k, other] of edits.entries()) {
        if (i === k || (i * 3 + k) % 29 !== 0) continue;
        const changes = playbooks.diff(a, written[i] ?? {});
        const said = playbooks.apply(written[k] ?? {}, changes);
        expect(said, `${one.name} on ${other.name}`).toEqual({
          _tag: "Playbook",
          playbook: mustRead(playbooks.write(one.make(edited[k] ?? p))),
        });
      }
  });
});
