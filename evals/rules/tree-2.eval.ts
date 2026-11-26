import { describe, expect, it } from "vitest";
import { tree } from "~/modules/tree/service.ts";
import type { ManagerNode, Rolled } from "~/modules/tree/types.ts";
import { reach, whole, node, coding, releases, support, nodes, ids, grown, refused, by, sound } from "./tree-world.ts";

describe("tree", () => {
  it("rules:tree/retiring-leaves-nothing-without-one-who-answers", () => {
    const stillThere = (list: readonly ManagerNode[]) => {
      for (const n of list.filter((x) => x.state !== "retired")) {
        if (n.above === null) continue;
        const above = by(list, n.above);
        expect(above.state, `${n.id} is under ${n.above}`).not.toBe("retired");
      }
    };
    // Its work goes up to who is above it, and what is below it moves up one.
    const up = grown(tree.grow(nodes, { is: "retire", id: "docs", open: { _tag: "up" } }, whole));
    expect(up.work).toBe("up");
    expect(by(up.nodes, "docs").state).toBe("retired");
    expect(by(up.nodes, "releases").above).toBe("coding");
    expect(by(up.nodes, "releases").state).toBe("runs");
    stillThere(up.nodes);
    sound(up.nodes);
    // The top of a tree: what is below goes to the co-worker.
    const top = grown(tree.grow(nodes, { is: "retire", id: "coding", open: { _tag: "up" } }, whole));
    expect(by(top.nodes, "docs").above).toBeNull();
    expect(by(top.nodes, "releases").above).toBe("docs");
    stillThere(top.nodes);
    sound(top.nodes);
    // Ended, with a reason.
    const end = grown(tree.grow(nodes, { is: "retire", id: "docs", open: { _tag: "end", why: "Merged into Coding" } }, whole));
    expect(end.work).toBe("ends");
    expect(by(end.nodes, "docs").state).toBe("retired");
    stillThere(end.nodes);
    // Without a reason, work is not ended.
    refused(tree.grow(nodes, { is: "retire", id: "docs", open: { _tag: "end", why: "" } }, whole));
    refused(tree.grow(nodes, { is: "retire", id: "docs", open: { _tag: "end", why: "   " } }, whole));
    // What stays is as it was.
    expect(by(up.nodes, "support")).toEqual(support);
    expect(by(up.nodes, "coding")).toEqual(coding);
    // Not there, and not twice.
    refused(tree.grow(nodes, { is: "retire", id: "nobody", open: { _tag: "up" } }, whole), /nobody/u);
    refused(tree.grow(up.nodes, { is: "retire", id: "docs", open: { _tag: "up" } }, whole), /docs/u);
    // Nothing can be made under one that is retired.
    refused(tree.grow(up.nodes, { is: "make", node: node("late", "docs", reach([])) }, whole), /docs/u);
  });

  it("rules:tree/under-and-above", () => {
    expect(ids(tree.under(nodes, "coding"))).toEqual(["docs", "releases"]);
    expect(ids(tree.under(nodes, "docs"))).toEqual(["releases"]);
    expect(tree.under(nodes, "releases")).toEqual([]);
    expect(ids(tree.under(nodes, null))).toEqual(["coding", "docs", "releases", "support"]);
    expect(tree.under(nodes, "nobody")).toEqual([]);
    expect(tree.under([], null)).toEqual([]);
    expect(ids(tree.above(nodes, "releases"))).toEqual(["coding", "docs"]);
    expect(ids(tree.above(nodes, "docs"))).toEqual(["coding"]);
    expect(tree.above(nodes, "coding")).toEqual([]);
    expect(tree.above(nodes, "support")).toEqual([]);
    expect(tree.above(nodes, "nobody")).toEqual([]);
    // The nodes are the nodes, not copies with changes.
    expect(tree.under(nodes, "docs")[0]).toEqual(releases);
    expect(tree.above(nodes, "docs")[0]).toEqual(coding);
  });

  it("rules:tree/rolled-up-adds-what-is-below-and-shows-the-loudest", () => {
    const row = (id: string, n: number, is: Rolled["is"]): Rolled => ({
      id,
      came: n,
      work: n + 1,
      out: n + 2,
      open: n + 3,
      waiting: n + 4,
      cost: n + 0.5,
      is,
    });
    const own = [row("coding", 1, "idle"), row("docs", 10, "working"), row("releases", 100, "needs you"), row("support", 1000, "idle")];
    const rolled = tree.roll(nodes, own);
    const at = (id: string) => {
      const found = rolled.find((r) => r.id === id);
      if (!found) throw new Error(`no row ${id}`);
      return found;
    };
    expect(rolled.map((r) => r.id).sort()).toEqual(["coding", "docs", "releases", "support"]);
    // Itself and everything below it, all the way down.
    expect(at("releases")).toEqual(own[2]);
    expect(at("support")).toEqual(own[3]);
    expect(at("docs")).toMatchObject({ came: 110, work: 112, out: 114, open: 116, waiting: 118, is: "needs you" });
    expect(at("docs").cost).toBeCloseTo(111, 9);
    expect(at("coding")).toMatchObject({ came: 111, work: 114, out: 117, open: 120, waiting: 123, is: "needs you" });
    expect(at("coding").cost).toBeCloseTo(112.5, 9);
    // The loudest shows: stuck over working over idle, and its own counts too.
    const stuck = tree.roll(nodes, [
      row("coding", 1, "idle"),
      row("docs", 1, "idle"),
      row("releases", 1, "stuck"),
      row("support", 1, "idle"),
    ]);
    expect(stuck.find((r) => r.id === "coding")?.is).toBe("stuck");
    expect(stuck.find((r) => r.id === "support")?.is).toBe("idle");
    const working = tree.roll(nodes, [
      row("coding", 1, "idle"),
      row("docs", 1, "idle"),
      row("releases", 1, "working"),
      row("support", 1, "idle"),
    ]);
    expect(working.find((r) => r.id === "coding")?.is).toBe("working");
    expect(working.find((r) => r.id === "docs")?.is).toBe("working");
    const own1 = tree.roll(nodes, [
      row("coding", 1, "working"),
      row("docs", 1, "idle"),
      row("releases", 1, "idle"),
      row("support", 1, "idle"),
    ]);
    expect(own1.find((r) => r.id === "coding")?.is).toBe("working");
    expect(own1.find((r) => r.id === "docs")?.is).toBe("idle");
    const quiet = tree.roll(
      nodes,
      own.map((r) => ({ ...r, is: "idle" as const })),
    );
    expect(quiet.every((r) => r.is === "idle")).toBe(true);
    const asleep = tree.roll([coding], [{ ...row("coding", 1, "idle"), is: "paused" }]);
    expect(asleep[0]?.is).toBe("paused");
    // What is given is as it was.
    expect(own[0]).toEqual(row("coding", 1, "idle"));
  });
});
