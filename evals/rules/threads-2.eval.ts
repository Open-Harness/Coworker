import { describe, expect, it } from "vitest";
import { threads } from "~/modules/threads/service.ts";
import type { ToolArgs } from "~/modules/threads/types.ts";
import { mandate, doer, sorted, github } from "./threads-world.ts";

describe("threads", () => {
  it("rules:threads/offer-by-role-a-checker-cannot-write-a-judge-only-judges", () => {
    const everything = { tools: [...doer.tools, "check", "judge", "find", "look", "act", "show_me", "set_up"] };
    const checks = threads.offer("checks", everything, mandate, github);
    expect(sorted(checks.tools)).toEqual(["bash", "check", "read", "skill"]);
    expect(checks.asks).toEqual([]);
    const judges = threads.offer("judges", everything, mandate, github);
    expect(judges.tools).toEqual(["judge"]);
    expect(judges.asks).toEqual([]);
    // In a chat: the co-worker's own, and never a connector's.
    const speaks = threads.offer("speaks", everything, mandate, github);
    expect(sorted(speaks.tools)).toEqual(["act", "find", "look", "note", "set_up", "show_me", "web_read", "web_search"]);
    expect(speaks.asks).toEqual([]);
    // A checker whose list has nothing to check with has only what it has.
    const bare = threads.offer("checks", { tools: ["read", "write", "edit", "github.merge"] }, mandate, github);
    expect([...bare.tools, ...bare.asks]).not.toEqual(expect.arrayContaining(["write"]));
    expect([...bare.tools, ...bare.asks]).not.toContain("github.merge");
    expect([...bare.tools, ...bare.asks]).not.toContain("edit");
  });

  it("rules:threads/a-call-is-narrowed-to-what-it-may-say", () => {
    const good: { [T in keyof ToolArgs]: readonly ToolArgs[T][] } = {
      note: [{ says: "Pat prefers mail." }],
      ask: [{ question: "Which one?" }, { question: "Which one?", options: ["a", "b"], best: "a", to: "bo" }],
      done_when: [
        { checks: [{ id: "c1", says: "Tests pass", by: "command", run: "pnpm test" }] },
        { checks: [{ id: "c2", says: "A person looked", by: "person" }] },
      ],
      report: [
        { result: "done", says: "Fixed.", evidence: [{ check: "c1", met: true, says: "CI is green", link: "https://example.com/1" }] },
        { result: "stuck", says: "No way.", evidence: [] },
        { result: "no", says: "Not a bug.", evidence: [{ check: "c1", met: false, says: "It works as designed." }] },
      ],
      check: [
        {
          evidence: [
            { check: "c1", met: false, says: "It fails.", at: "src/a.ts:3" },
            { check: "c2", met: true, says: "Fine." },
          ],
          says: "Sent back.",
        },
      ],
      judge: [
        {
          verdicts: [
            { manager: "m1", kind: "bug", is: true, why: "A bug.", fit: 0.9 },
            { manager: "m1", kind: "idea", is: false, why: "Not an idea.", fit: 0 },
          ],
        },
        { verdicts: [{ manager: "m1", kind: "bug", is: true, why: "A bug.", fit: 1 }], joins: "w-1" },
        { verdicts: [] },
      ],
      skill: [{ id: "this-repo" }, { id: "this-repo", path: "tests.md" }],
      web_read: [{ url: "https://example.com/a" }],
      web_search: [{ words: "safari login bug" }],
      find: [{ words: "northwind" }],
      look: [{ at: "work", id: "w-1" }, { at: "spending" }],
      act: [
        { doing: "work.add", values: { title: "Fix it" } },
        { doing: "manager.pause", values: {} },
      ],
      show_me: [{ doing: "work.add", values: { title: "Fix it" } }],
      set_up: [{ event: { is: "found", findings: [] } }],
    };
    for (const tool of Object.keys(good) as (keyof ToolArgs)[])
      for (const args of good[tool]) expect(threads.read(tool, args), `${tool} ${JSON.stringify(args)}`).toEqual({ _tag: "Args", args });
    for (const at of ["work", "manager", "intake", "spending", "asks", "thread", "playbook"] as const)
      expect(threads.read("look", { at })).toEqual({ _tag: "Args", args: { at } });
    for (const result of ["done", "no", "stuck"] as const)
      expect(threads.read("report", { result, says: "x", evidence: [] })).toEqual({
        _tag: "Args",
        args: { result, says: "x", evidence: [] },
      });
    for (const by of ["command", "agent", "person", "connector"] as const)
      expect(threads.read("done_when", { checks: [{ id: "c", says: "s", by }] })._tag).toBe("Args");
  });

  it("rules:threads/a-wrong-call-comes-back-in-words", () => {
    const wrong: readonly [keyof ToolArgs, unknown, RegExp][] = [
      ["note", {}, /says/u],
      ["note", { says: 5 }, /says/u],
      ["ask", { question: 5 }, /question/u],
      ["ask", { question: "q", options: "a" }, /options/u],
      ["ask", { question: "q", options: [1, 2] }, /options/u],
      ["ask", { options: ["a"] }, /question/u],
      ["done_when", { checks: "all" }, /checks/u],
      ["done_when", { checks: [{ id: "c", says: "s", by: "magic" }] }, /by/u],
      ["done_when", { checks: [{ says: "s", by: "agent" }] }, /id/u],
      ["done_when", {}, /checks/u],
      ["report", { result: "maybe", says: "s", evidence: [] }, /result/u],
      ["report", { result: "done", says: "s", evidence: [{ check: "c", met: "yes", says: "x" }] }, /met/u],
      ["report", { result: "done", evidence: [] }, /says/u],
      ["report", { result: "done", says: "s" }, /evidence/u],
      ["report", { result: "done", says: "s", evidence: "none" }, /evidence/u],
      ["check", { evidence: [] }, /says/u],
      ["check", { evidence: [{ check: "c", says: "x" }], says: "s" }, /met/u],
      ["judge", { verdicts: [{ manager: "m", kind: "k", is: true, why: "w", fit: 1.5 }] }, /fit/u],
      ["judge", { verdicts: [{ manager: "m", kind: "k", is: true, why: "w", fit: -0.1 }] }, /fit/u],
      ["judge", { verdicts: [{ manager: "m", kind: "k", is: true, why: "w", fit: Number.NaN }] }, /fit/u],
      ["judge", { verdicts: [{ manager: "m", kind: "k", is: "true", why: "w", fit: 1 }] }, /\bis\b/u],
      ["judge", { verdicts: [{ manager: "m", kind: "k", is: true, fit: 1 }] }, /why/u],
      ["judge", {}, /verdicts/u],
      ["skill", {}, /id/u],
      ["web_read", { url: 5 }, /url/u],
      ["web_search", {}, /words/u],
      ["find", { words: ["a"] }, /words/u],
      ["look", { at: "everything" }, /at/u],
      ["look", {}, /at/u],
      ["act", { doing: "work.add", values: { title: 5 } }, /values|title/u],
      ["act", { values: {} }, /doing/u],
      ["act", { doing: "work.add" }, /values/u],
      ["show_me", { doing: 5, values: {} }, /doing/u],
      ["set_up", {}, /event/u],
    ];
    for (const [tool, args, names] of wrong) {
      const said = threads.read(tool, args);
      expect(said._tag, `${tool} ${JSON.stringify(args)}`).toBe("Wrong");
      if (said._tag === "Wrong") {
        expect(said.says.trim().length).toBeGreaterThan(3);
        expect(said.says).toMatch(names);
        expect(said.says).not.toMatch(/\b(blocked|pending)\b/iu);
      }
    }
    // Not even an object.
    for (const args of [null, undefined, "says", 5, true, [], [{ says: "x" }]])
      expect(threads.read("note", args)._tag, String(args)).toBe("Wrong");
    // More than it was asked for: refused, or left out. Never passed on.
    for (const [tool, args] of [
      ["note", { says: "x", approved: true, mandate: "all" }],
      ["web_read", { url: "https://example.com", headers: { Authorization: "Bearer x" } }],
      ["act", { doing: "work.add", values: { title: "x" }, as: "ama" }],
    ] as const) {
      const said = threads.read(tool, args);
      if (said._tag === "Args") {
        const kept = said.args as unknown as Record<string, unknown>;
        for (const key of ["approved", "mandate", "headers", "as"]) expect(key in kept, `${tool} ${key}`).toBe(false);
      }
    }
    // A key that names the prototype changes nothing, in this call or any other.
    const parsed: unknown = JSON.parse('{"says":"x","__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}');
    const said = threads.read("note", parsed);
    if (said._tag === "Args") expect("polluted" in said.args).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, "polluted")).toBe(false);
    expect("polluted" in {}).toBe(false);
  });

  it("rules:threads/evidence-is-by-this-agent-in-this-thread", () => {
    const by = { agent: "reviewer", thread: "t-9" };
    const report: ToolArgs["report"] = {
      result: "done",
      says: "All done.",
      evidence: [
        { check: "c1", met: true, says: "CI is green", link: "https://example.com/ci/1" },
        { check: "c2", met: false, says: "No test yet." },
      ],
    };
    const made = threads.evidence(report, by, 1000);
    expect(made).toHaveLength(2);
    expect(made[0]).toMatchObject({ check: "c1", met: true, says: "CI is green", link: "https://example.com/ci/1", by, at: 1000 });
    expect(made[1]).toMatchObject({ check: "c2", met: false, says: "No test yet.", by, at: 1000 });
    expect(made[1] && "link" in made[1] && made[1].link !== undefined).toBe(false);
    const checked = threads.evidence(
      {
        evidence: [
          { check: "c1", met: false, says: "It fails.", at: "src/a.ts:3" },
          { check: "c2", met: true, says: "Fine." },
        ],
        says: "Sent back.",
      },
      by,
      2000,
    );
    expect(checked.map((e) => [e.check, e.met, e.says])).toEqual([
      ["c1", false, "It fails."],
      ["c2", true, "Fine."],
    ]);
    for (const e of checked) expect(e).toMatchObject({ by, at: 2000 });
    expect(threads.evidence({ result: "stuck", says: "Stuck.", evidence: [] }, by, 1)).toEqual([]);
    expect(threads.evidence({ evidence: [], says: "Nothing." }, by, 1)).toEqual([]);
    // The summary is not a check.
    expect(made.map((e) => e.says)).not.toContain("All done.");
    // Whatever it writes about who it is, it is who it is: this agent, in this thread.
    const claimed: unknown = JSON.parse(
      '{"result":"done","says":"ok","evidence":[{"check":"c1","met":true,"says":"Ama looked.","by":{"person":"ama"},"at":5}]}',
    );
    const faked = threads.evidence(claimed as ToolArgs["report"], by, 1000);
    expect(faked).toHaveLength(1);
    expect(faked[0]?.by).toEqual(by);
    expect(faked[0]?.at).toBe(1000);
  });
});
