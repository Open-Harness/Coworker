import { describe, expect, it } from "vitest";
import { tree } from "~/modules/tree/service.ts";
import {
  grant,
  reach,
  whole,
  node,
  coding,
  docs,
  releases,
  support,
  nodes,
  ids,
  grown,
  refused,
  by,
  flat,
  allows,
  sound,
} from "./tree-world.ts";

describe("tree", () => {
  it("rules:tree/made-under-the-co-worker-or-a-manager-with-a-part-of-its-reach", () => {
    sound(nodes);
    // A part of the reach above, under the co-worker or under a manager.
    const sales = node("sales", null, reach([grant("email", "*", { "email.reply": "ask" })], { perWork: 10 }));
    const a = grown(tree.grow(nodes, { is: "make", node: sales }, whole));
    expect(ids(a.nodes)).toEqual(["coding", "docs", "releases", "sales", "support"]);
    expect(a).toMatchObject({ narrowed: [], work: "stays" });
    const sub = node("sub", "docs", reach([grant("github", "*", { "github.read": "on" })], { perWork: 2 }));
    const b = grown(tree.grow(nodes, { is: "make", node: sub }, whole));
    expect(by(b.nodes, "sub").above).toBe("docs");
    expect(by(b.nodes, "sub").reach).toEqual(sub.reach);
    sound(b.nodes);
    // What was there is as it was.
    for (const n of nodes) expect(by(b.nodes, n.id)).toEqual(n);
    // An action stronger than the one above has.
    refused(
      tree.grow(nodes, { is: "make", node: node("m", "coding", reach([grant("github", "*", { "github.merge": "on" })])) }, whole),
      /github\.merge/u,
    );
    refused(
      tree.grow(nodes, { is: "make", node: node("m", "docs", reach([grant("github", "*", { "github.push": "on" })])) }, whole),
      /github\.push/u,
    );
    // An action the one above does not have, an account, a place, a limit.
    refused(
      tree.grow(nodes, { is: "make", node: node("m", "docs", reach([grant("github", "*", { "github.label": "ask" })])) }, whole),
      /github\.label/u,
    );
    refused(tree.grow(nodes, { is: "make", node: node("m", "coding", reach([grant("crm", "*", { "crm.read": "on" })])) }, whole), /crm/u);
    refused(
      tree.grow(nodes, { is: "make", node: node("m", "support", reach([grant("github", "*", { "github.read": "on" })])) }, whole),
      /github/u,
    );
    refused(tree.grow(nodes, { is: "make", node: node("m", "coding", reach([], { perWork: 11 })) }, whole), /11|perWork|work/u);
    refused(tree.grow(nodes, { is: "make", node: node("m", "docs", reach([], { perWork: 6 })) }, whole), /6|perWork|work/u);
    // Under the co-worker the whole is the limit.
    refused(tree.grow(nodes, { is: "make", node: node("m", null, reach([grant("crm", "*", { "crm.read": "on" })])) }, whole), /crm/u);
    // Every wider thing is said, not only the first.
    const two = tree.grow(
      nodes,
      { is: "make", node: node("m", "coding", reach([grant("github", "*", { "github.merge": "on", "github.label": "on" })])) },
      whole,
    );
    refused(two, /github\.merge/u);
    expect(two._tag === "Refused" && two.problems.map((p) => p.says).join(" ")).toMatch(/github\.label/u);
    // Nothing is made twice, and nothing is made under what is not there.
    refused(tree.grow(nodes, { is: "make", node: node("docs", null, reach([])) }, whole), /docs/u);
    refused(tree.grow(nodes, { is: "make", node: node("m", "nobody", reach([])) }, whole), /nobody/u);
    refused(tree.grow(nodes, { is: "make", node: node("m", "m", reach([])) }, whole));
    // Nothing to give, a manager with nothing: allowed.
    grown(tree.grow(nodes, { is: "make", node: node("empty", "releases", reach([])) }, whole));
  });

  it("rules:tree/moving-never-makes-a-loop-or-gives-more", () => {
    const a = grown(tree.grow(nodes, { is: "move", id: "releases", above: "coding" }, whole));
    expect(by(a.nodes, "releases").above).toBe("coding");
    expect(by(a.nodes, "docs").above).toBe("coding");
    sound(a.nodes);
    // To the top, and back with its children.
    const top = grown(tree.grow(nodes, { is: "move", id: "docs", above: null }, whole));
    expect(by(top.nodes, "docs").above).toBeNull();
    expect(by(top.nodes, "releases").above).toBe("docs");
    sound(top.nodes);
    // Under itself, under what is below it: a loop.
    refused(tree.grow(nodes, { is: "move", id: "docs", above: "docs" }, whole), /docs/u);
    refused(tree.grow(nodes, { is: "move", id: "coding", above: "docs" }, whole));
    refused(tree.grow(nodes, { is: "move", id: "coding", above: "releases" }, whole));
    refused(tree.grow(nodes, { is: "move", id: "docs", above: "releases" }, whole));
    // Not there.
    refused(tree.grow(nodes, { is: "move", id: "nobody", above: null }, whole), /nobody/u);
    refused(tree.grow(nodes, { is: "move", id: "docs", above: "nobody" }, whole), /nobody/u);
    // Under one that has less: never more than it was given, so it is refused or narrowed to fit.
    const less = tree.grow(nodes, { is: "move", id: "docs", above: "support" }, whole);
    if (less._tag === "Grown") {
      sound(less.nodes);
      expect(less.narrowed).toContain("docs");
    } else refused(less);
    // The names and answers stay.
    expect(by(a.nodes, "releases")).toMatchObject({ name: "RELEASES", answers: "bo", state: "runs" });
  });

  it("rules:tree/what-is-taken-back-above-is-gone-below", () => {
    const less = reach([grant("github", "*", { "github.read": "on", "github.comment": "ask" })], { perWork: 4, perDay: 20 });
    const a = grown(tree.grow(nodes, { is: "reach", id: "coding", reach: less }, whole));
    expect(by(a.nodes, "coding").reach).toEqual(less);
    sound(a.nodes);
    // Docs had comment on and push ask: now at most what coding has. Releases had read only, and a limit of 3: as it was.
    expect(flat(by(a.nodes, "docs").reach)).toEqual({ "github|*|github.read": "on", "github|*|github.comment": "ask" });
    expect(by(a.nodes, "docs").reach.limits.perWork).toBe(4);
    expect(by(a.nodes, "docs").reach.limits.perDay).toBeUndefined();
    expect(by(a.nodes, "releases").reach).toEqual(releases.reach);
    expect(a.narrowed.filter((id) => id !== "coding").sort()).toEqual(["docs"]);
    expect(by(a.nodes, "support")).toEqual(support);
    // Given back above: it does not come back below.
    const back = grown(tree.grow(a.nodes, { is: "reach", id: "coding", reach: coding.reach }, whole));
    expect(by(back.nodes, "coding").reach).toEqual(coding.reach);
    expect(flat(by(back.nodes, "docs").reach)).toEqual({ "github|*|github.read": "on", "github|*|github.comment": "ask" });
    expect(back.narrowed).not.toContain("docs");
    // All the way down.
    const none = grown(tree.grow(nodes, { is: "reach", id: "coding", reach: reach([]) }, whole));
    for (const id of ["docs", "releases"]) expect(flat(by(none.nodes, id).reach), id).toEqual({});
    expect(none.narrowed).toEqual(expect.arrayContaining(["docs", "releases"]));
    sound(none.nodes);
    // A reach wider than the one above is an answer, and nothing changes.
    refused(
      tree.grow(nodes, { is: "reach", id: "docs", reach: reach([grant("github", "*", { "github.merge": "on" })]) }, whole),
      /github\.merge/u,
    );
    refused(tree.grow(nodes, { is: "reach", id: "coding", reach: reach([], { perWork: 99 }) }, whole), /99|perWork|work/u);
    refused(tree.grow(nodes, { is: "reach", id: "nobody", reach: reach([]) }, whole), /nobody/u);
    // A place only: a manager that has every place of an account, narrowed to one place.
    const place = grown(
      tree.grow(nodes, { is: "reach", id: "coding", reach: reach([grant("github", "acme/web", { "github.read": "on" })]) }, whole),
    );
    expect(allows(by(place.nodes, "docs").reach, "github", "acme/web", "github.read")).toBe("on");
    expect(allows(by(place.nodes, "docs").reach, "github", "acme/api", "github.read")).toBe("off");
    expect(allows(by(place.nodes, "releases").reach, "github", "acme/api", "github.read")).toBe("off");
    sound(place.nodes);
  });

  it("rules:tree/pausing-stops-taking-on-and-keeps-what-is-open", () => {
    const paused = grown(tree.grow(nodes, { is: "pause", id: "coding" }, whole));
    expect(by(paused.nodes, "coding").state).toBe("paused");
    expect(paused.work).toBe("stays");
    expect(by(paused.nodes, "coding").reach).toEqual(coding.reach);
    // The ones below are the ones below: a pause is of one manager.
    expect(by(paused.nodes, "docs").state).toBe("runs");
    const back = grown(tree.grow(paused.nodes, { is: "go on", id: "coding" }, whole));
    expect(by(back.nodes, "coding").state).toBe("runs");
    expect(back.nodes).toEqual(nodes);
    // Twice is once: the same, or told so, never a different state.
    const twice = tree.grow(paused.nodes, { is: "pause", id: "coding" }, whole);
    if (twice._tag === "Grown") expect(by(twice.nodes, "coding").state).toBe("paused");
    else refused(twice);
    const onceMore = tree.grow(nodes, { is: "go on", id: "coding" }, whole);
    if (onceMore._tag === "Grown") expect(by(onceMore.nodes, "coding").state).toBe("runs");
    else refused(onceMore);
    // Not there, and gone for good.
    refused(tree.grow(nodes, { is: "pause", id: "nobody" }, whole), /nobody/u);
    refused(tree.grow(nodes, { is: "go on", id: "nobody" }, whole), /nobody/u);
    const retired = grown(tree.grow(nodes, { is: "retire", id: "support", open: { _tag: "up" } }, whole)).nodes;
    refused(tree.grow(retired, { is: "go on", id: "support" }, whole), /support/u);
    refused(tree.grow(retired, { is: "pause", id: "support" }, whole), /support/u);
    // Naming is only the name.
    const named = grown(tree.grow(nodes, { is: "rename", id: "docs", name: "Documents" }, whole));
    expect(by(named.nodes, "docs")).toEqual({ ...docs, name: "Documents" });
    expect(named.work).toBe("stays");
    refused(tree.grow(nodes, { is: "rename", id: "nobody", name: "X" }, whole), /nobody/u);
  });
});
