import { describe, expect, it } from "vitest";
import { playbooks } from "~/modules/playbook/service.ts";
import type { Playbook, Problem, Surroundings } from "~/modules/playbook/types.ts";
import { around, mapStep, plain, playbookOf } from "./playbook-world.ts";

const repo = () => playbookOf("repo");
const customers = () => playbookOf("customers");
const check = (p: Playbook, a: Surroundings = around): readonly Problem[] => playbooks.check(p, a);
const says = (found: readonly Problem[], at: string, line: string, re: RegExp): boolean =>
  found.some((p) => p.at === at && p.line === line && re.test(p.says) && plain(p.says));

describe("playbook: check, steps", () => {
  it("rules:playbook/check-says-a-step-that-cannot-end", () => {
    const back = (to: string, times: number) => (s: Playbook["kinds"][number]["steps"][number]) => ({
      ...s,
      otherwise: { back: to, times, then: { ask: "ama" } } as const,
    });
    expect(says(check(mapStep(repo(), "bug", "build", back("nowhere", 2))), "workflow.yaml", "workflow/bug/build", /nowhere/u)).toBe(true);
    // A step of another kind is nowhere for this one.
    expect(says(check(mapStep(customers(), "fault", "tell", back("find", 2))), "workflow.yaml", "workflow/fault/tell", /find/u)).toBe(true);
    expect(check(mapStep(customers(), "fault", "tell", back("see", 2)))).toEqual([]);
    for (const times of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])
      expect(
        says(check(mapStep(repo(), "bug", "build", back("build", times))), "workflow.yaml", "workflow/bug/build", /build|times/u),
        String(times),
      ).toBe(true);
    for (const times of [1, 2, 3, 10]) expect(check(mapStep(repo(), "bug", "build", back("build", times))), String(times)).toEqual([]);
    // Two steps that send each other back still end: each has its times, and then asks.
    const ping = mapStep(mapStep(repo(), "bug", "understand", back("build", 1)), "bug", "build", back("understand", 1));
    expect(check(ping)).toEqual([]);
    // A step that goes back twice, and then drops.
    const drop = mapStep(repo(), "bug", "build", (s) => ({
      ...s,
      otherwise: { back: "understand", times: 2, then: { drop: "It cannot be done" } },
    }));
    expect(check(drop)).toEqual([]);
  });

  it("rules:playbook/check-says-who-checks-is-who-did", () => {
    const set = (
      by: Playbook["kinds"][number]["steps"][number]["by"],
      checkedBy: Playbook["kinds"][number]["steps"][number]["checkedBy"],
    ) => mapStep(repo(), "bug", "build", (s) => ({ ...s, by, checkedBy }));
    expect(says(check(set({ agent: "doer" }, { agent: "doer" })), "workflow.yaml", "workflow/bug/build", /doer/u)).toBe(true);
    expect(says(check(set({ person: "ama" }, { person: "ama" })), "workflow.yaml", "workflow/bug/build", /ama/u)).toBe(true);
    expect(check(set({ agent: "doer" }, { agent: "reviewer" }))).toEqual([]);
    expect(check(set({ agent: "doer" }, { person: "ama" }))).toEqual([]);
    expect(check(set({ person: "ama" }, { person: "bo" }))).toEqual([]);
    expect(check(set({ person: "ama" }, { agent: "doer" }))).toEqual([]);
    expect(check(set({ manager: true }, { code: true }))).toEqual([]);
    expect(check(set({ agent: "doer" }, { code: true }))).toEqual([]);
    // The same agent may do one step and check another.
    const crossed = mapStep(set({ agent: "doer" }, { agent: "reviewer" }), "bug", "check", (s) => ({
      ...s,
      by: { agent: "reviewer" },
      checkedBy: { agent: "doer" },
    }));
    expect(check(crossed)).toEqual([]);
  });
});
