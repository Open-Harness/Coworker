import { describe, expect, it } from "vitest";
import { boardRules } from "./service.ts";
import type { TaskFacts } from "./types.ts";

const stage = (facts: Partial<TaskFacts>) => boardRules.stageOf({ openQuestions: 0, runs: [], ...facts }).stage;
const ran = (report?: TaskFacts["runs"][number]["report"], reportedAt = 10) =>
  ({ state: "running", ...(report === undefined ? {} : { report, reportedAt }) }) as const;

describe("board", () => {
  it("acc:board/stages", () => {
    // First match wins, in model.md's order.
    expect(stage({ openQuestions: 1, runs: [ran("ready")] })).toBe("person.answer");
    expect(stage({ runs: [ran("blocked", 5), ran("ready", 9)] })).toBe("person.review");
    expect(stage({ runs: [ran("blocked")] })).toBe("person.blocked");
    expect(stage({ runs: [ran("failed", 10)], lastPersonWriteAt: 4 })).toBe("person.blocked");
    // A person wrote after the block: the run can go on.
    expect(stage({ runs: [ran("blocked", 10)], lastPersonWriteAt: 12 })).toBe("working");
    expect(stage({ runs: [] })).toBe("queued");
    expect(stage({ runs: [{ state: "queued" }] })).toBe("queued");
    expect(stage({ runs: [ran("waiting")] })).toBe("idle");
    expect(stage({ runs: [ran("progress")] })).toBe("working");
    expect(stage({ runs: [ran()] })).toBe("working");
    expect(boardRules.stageOf({ openQuestions: 2, runs: [] }).label).toBe("Needs your answer");
  });
});
