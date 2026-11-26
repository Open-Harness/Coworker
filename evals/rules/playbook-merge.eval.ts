import { describe, expect, it } from "vitest";
import { playbooks } from "~/modules/playbook/service.ts";
import type { Change, Playbook, Problem } from "~/modules/playbook/types.ts";
import { filledFiles, mapAgent, mapStep, mustRead, plain, playbookOf, textOf } from "./playbook-world.ts";
import { edits } from "./playbook-edits.ts";

const repo = () => playbookOf("repo");
const problemsOf = (said: ReturnType<typeof playbooks.apply>): readonly Problem[] => {
  if (said._tag !== "Problems") throw new Error("Expected problems");
  return said.problems;
};
const lastOf = (line: string) => line.split("/").pop() ?? line;
const names = (problems: readonly Problem[], line: string) =>
  problems.some((p) => p.line === line && plain(p.says) && (p.says.includes(line) || p.says.includes(lastOf(line))));
const told = (p: Playbook, add: string): Playbook => mapAgent(p, "doer", (a) => ({ ...a, told: `${a.told} ${add}` }));
const does = (p: Playbook, add: string): Playbook => mapStep(p, "bug", "build", (s) => ({ ...s, does: `${s.does} ${add}` }));

describe("playbook: apply and merge", () => {
  it("rules:playbook/apply-refuses-what-is-no-longer-so", () => {
    const p = repo();
    const a = playbooks.write(p);
    // Taken on twice: the second time the `was` is gone, whether the line was edited, added or removed.
    for (const edit of edits) {
      const q = edit.make(p);
      const b = playbooks.write(q);
      const changes = playbooks.diff(a, b);
      const found = problemsOf(playbooks.apply(b, changes));
      for (const c of changes) expect(names(found, c.line), `${edit.name} ${c.line}`).toBe(true);
      for (const f of found) expect(f.at.length).toBeGreaterThan(0);
    }
    // All or nothing: one change that still holds does not make it a playbook when another does not.
    const told = edits.find((e) => e.name === "told")!;
    const does = edits.find((e) => e.name === "does")!;
    const mixed = [...playbooks.diff(a, playbooks.write(told.make(p))), ...playbooks.diff(a, playbooks.write(does.make(p)))];
    const found = problemsOf(playbooks.apply(playbooks.write(does.make(p)), mixed));
    expect(names(found, "workflow/bug/build")).toBe(true);
    expect(found.some((x) => x.line === "agents/doer/told")).toBe(false);
    expect(
      problemsOf(playbooks.apply(playbooks.write(does.make(p)), [...mixed].reverse())).some((x) => x.line === "workflow/bug/build"),
    ).toBe(true);
    // Someone else wrote that line differently in the meantime.
    const other = mapAgent(p, "doer", (x) => ({ ...x, told: `${x.told} Always ask.` }));
    expect(
      names(problemsOf(playbooks.apply(playbooks.write(other), playbooks.diff(a, playbooks.write(told.make(p))))), "agents/doer/told"),
    ).toBe(true);
    // Taken on and then given back to the same files: refused, not applied twice.
    const first = playbooks.apply(a, playbooks.diff(a, playbooks.write(told.make(p))));
    expect(first._tag).toBe("Playbook");
    if (first._tag === "Playbook")
      expect(
        problemsOf(playbooks.apply(playbooks.write(first.playbook), playbooks.diff(a, playbooks.write(told.make(p))))).length,
      ).toBeGreaterThan(0);
    // A line that is not there, said to have been.
    const ghost: Change = { line: "agents/ghost/told", was: "Be careful.", becomes: "Be bold." };
    expect(names(problemsOf(playbooks.apply(a, [ghost])), "agents/ghost/told")).toBe(true);
    // A line that is there, said to be new.
    const there: Change = { line: "agents/doer/told", was: null, becomes: "Be bold." };
    expect(names(problemsOf(playbooks.apply(a, [there])), "agents/doer/told")).toBe(true);
    // A removal of what is already gone.
    const gone: Change = { line: "triggers/own", was: textOf(p, "triggers/own"), becomes: null };
    const without = playbooks.write(edits.find((e) => e.name === "no trigger")!.make(p));
    expect(names(problemsOf(playbooks.apply(without, [gone])), "triggers/own")).toBe(true);
    // The same text in another step does not stand in for it.
    const moved = mapStep(p, "bug", "build", (s) => ({ ...s, does: "Something else." }));
    const stale = playbooks.diff(a, playbooks.write(does.make(p)));
    expect(names(problemsOf(playbooks.apply(playbooks.write(moved), stale)), "workflow/bug/build")).toBe(true);
  });

  it("rules:playbook/merge-keeps-both-changes", () => {
    const p = repo();
    const a = playbooks.write(p);
    // Anything that changes different lines is merged, either way round, even in one file.
    const edited = edits.map((e) => e.make(p));
    const written = edited.map((q) => playbooks.write(q));
    for (const [i, one] of edits.entries())
      for (const [j, other] of edits.entries()) {
        if (j - i !== 4) continue;
        const expected = { _tag: "Playbook", playbook: mustRead(playbooks.write(other.make(edited[i] ?? p))) };
        const merged = playbooks.merge(a, written[i] ?? {}, written[j] ?? {});
        expect(merged._tag, `${one.name} + ${other.name}`).toBe("Merged");
        if (merged._tag === "Merged") expect(playbooks.read(merged.files), `${one.name} + ${other.name}`).toEqual(expected);
        if (i % 3 !== 0) continue;
        const swapped = playbooks.merge(a, written[j] ?? {}, written[i] ?? {});
        expect(swapped._tag).toBe("Merged");
        if (swapped._tag === "Merged") expect(playbooks.read(swapped.files)).toEqual(expected);
      }
    // Pairs that share a file or a page, both ways round.
    for (const [x, y] of [
      ["told", "model"],
      ["section", "new section"],
      ["does", "new step"],
      ["new agent", "no eval"],
      ["no trigger", "only"],
      ["aim", "never"],
    ] as const) {
      const one = edits.find((e) => e.name === x)!;
      const other = edits.find((e) => e.name === y)!;
      const expected = { _tag: "Playbook", playbook: mustRead(playbooks.write(other.make(one.make(p)))) };
      for (const [first, second] of [
        [one, other],
        [other, one],
      ] as const) {
        const merged = playbooks.merge(a, playbooks.write(first.make(p)), playbooks.write(second.make(p)));
        expect(merged._tag, `${x} + ${y}`).toBe("Merged");
        if (merged._tag === "Merged") expect(playbooks.read(merged.files), `${x} + ${y}`).toEqual(expected);
      }
    }
    // Nothing changed, or only one side: that side.
    const b = playbooks.write(told(p, "Never guess."));
    for (const [theirs, yours, wanted] of [
      [a, a, a],
      [b, a, b],
      [a, b, b],
      [b, b, b],
    ] as const) {
      const merged = playbooks.merge(a, theirs, yours);
      expect(merged._tag).toBe("Merged");
      if (merged._tag === "Merged") expect(playbooks.read(merged.files)).toEqual(playbooks.read(wanted));
    }
    // The same thing done twice is done once: an edit, an addition, a removal.
    for (const edit of edits.filter((e) => ["does", "new agent", "no trigger", "new step", "new section"].includes(e.name))) {
      const same = playbooks.write(edit.make(p));
      const merged = playbooks.merge(a, same, same);
      expect(merged._tag, edit.name).toBe("Merged");
      if (merged._tag === "Merged") expect(playbooks.read(merged.files), edit.name).toEqual(playbooks.read(same));
    }
    // Written in another way, the same change is the same change.
    const hand = playbooks.merge(filledFiles("repo"), b, playbooks.write(told(p, "Never guess.")));
    expect(hand._tag).toBe("Merged");
  });

  it("rules:playbook/merge-shows-both-when-the-same-line-differs", () => {
    const p = repo();
    const a = playbooks.write(p);
    const mine = told(p, "Always ask.");
    const theirs = told(p, "Never guess.");
    const said = playbooks.merge(a, playbooks.write(theirs), playbooks.write(mine));
    expect(said._tag).toBe("Clash");
    if (said._tag !== "Clash") return;
    expect(said).not.toHaveProperty("files");
    expect(said.clashes).toEqual([
      {
        line: "agents/doer/told",
        base: textOf(p, "agents/doer/told"),
        theirs: textOf(theirs, "agents/doer/told"),
        yours: textOf(mine, "agents/doer/told"),
      },
    ]);
    // The other way round, theirs and yours change places.
    const back = playbooks.merge(a, playbooks.write(mine), playbooks.write(theirs));
    expect(back._tag === "Clash" && back.clashes).toEqual([
      {
        line: "agents/doer/told",
        base: textOf(p, "agents/doer/told"),
        theirs: textOf(mine, "agents/doer/told"),
        yours: textOf(theirs, "agents/doer/told"),
      },
    ]);
    // Several at once, with a clean change beside them: all the clashes, and no half merge.
    const theirsMany = mapStep(told(p, "Never guess."), "bug", "build", (s) => ({ ...s, does: `${s.does} Be quick.` }));
    const yoursMany = does(told(p, "Always ask."), "Be slow.");
    const many = playbooks.merge(
      a,
      playbooks.write({ ...theirsMany, objective: { ...p.objective, aim: { value: 9, by: "2027-06-30" } } }),
      playbooks.write(yoursMany),
    );
    expect(many._tag === "Clash" && many.clashes.map((c) => c.line).sort()).toEqual(["agents/doer/told", "workflow/bug/build"]);
    // A removal against a change, either way round, and an addition that is not the same.
    const removed = edits.find((e) => e.name === "no trigger")!.make(p);
    const changed = edits.find((e) => e.name === "only")!.make(p);
    const own = { ...p, triggers: p.triggers.map((t) => (t.id === "own" ? { ...t, only: "It is one of mine, or of the team" } : t)) };
    const gone = playbooks.merge(a, playbooks.write(removed), playbooks.write(own));
    expect(gone._tag === "Clash" && gone.clashes).toEqual([
      { line: "triggers/own", base: textOf(p, "triggers/own"), theirs: null, yours: textOf(own, "triggers/own") },
    ]);
    const kept = playbooks.merge(a, playbooks.write(own), playbooks.write(removed));
    expect(kept._tag === "Clash" && kept.clashes).toEqual([
      { line: "triggers/own", base: textOf(p, "triggers/own"), theirs: textOf(own, "triggers/own"), yours: null },
    ]);
    expect(playbooks.merge(a, playbooks.write(removed), playbooks.write(changed))._tag).toBe("Merged");
    const scribe = edits.find((e) => e.name === "new agent")!.make(p);
    const other = mapAgent(scribe, "scribe", (x) => ({ ...x, told: "Say it in one line." }));
    const added = playbooks.merge(a, playbooks.write(scribe), playbooks.write(other));
    expect(added._tag).toBe("Clash");
    if (added._tag === "Clash") {
      expect(added.clashes.length).toBeGreaterThan(0);
      for (const c of added.clashes) {
        expect(c.line.startsWith("agents/scribe")).toBe(true);
        expect(c.base).toBeNull();
      }
    }
  });
});
