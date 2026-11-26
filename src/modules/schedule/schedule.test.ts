import { describe, expect, it } from "vitest";
import { context, ToolBench } from "../../../test/engine.ts";
import { DeliverInstruction, listSchedules, nextOccurrence, scheduleTool } from "./service.ts";

const at = (text: string) => Date.parse(text);
const iso = (time: number) => new Date(time).toISOString();

describe("the next occurrence", () => {
  it.each([
    [
      "minutes",
      { unit: "minute", interval: 10, timezone: "UTC" },
      "2026-01-01T00:00:00Z",
      "2026-01-01T00:00:00Z",
      "2026-01-01T00:10:00.000Z",
    ],
    [
      "missed runs at once",
      { unit: "hour", interval: 1, timezone: "UTC" },
      "2026-01-01T00:00:00Z",
      "2026-01-01T05:30:00Z",
      "2026-01-01T06:00:00.000Z",
    ],
    [
      "local time across spring forward",
      { unit: "day", interval: 1, timezone: "Europe/Berlin" },
      "2026-03-28T08:00:00Z",
      "2026-03-28T08:00:00Z",
      "2026-03-29T07:00:00.000Z",
    ],
    [
      "local time across fall back",
      { unit: "week", interval: 1, timezone: "Europe/Berlin" },
      "2026-10-19T07:00:00Z",
      "2026-10-19T07:00:00Z",
      "2026-10-26T08:00:00.000Z",
    ],
    [
      "the end of short months",
      { unit: "month", interval: 1, timezone: "UTC" },
      "2026-01-31T09:00:00Z",
      "2026-01-31T09:00:00Z",
      "2026-02-28T09:00:00.000Z",
    ],
  ] as const)("keeps %s", (_name, recurrence, previous, now, expected) => {
    expect(iso(nextOccurrence(at(previous), recurrence, at(now)))).toBe(expected);
  });
});

describe("the schedule tool", () => {
  const open = () => ToolBench.open([scheduleTool], { tasks: [DeliverInstruction] });

  it("lists what waits, soonest first", async () => {
    const bench = await open();
    const later = await bench.call("schedule", { instruction: "Later", delaySeconds: 7_200 });
    expect(later).toMatchObject({ isError: false, details: { instruction: "Later" } });
    const repeat = { unit: "day", interval: 1, timezone: "Africa/Lagos" };
    await bench.call("schedule", { instruction: "Sooner", delaySeconds: 60, repeat });
    expect(await listSchedules(bench.harness, context)).toMatchObject([
      { instruction: "Sooner", chatId: bench.conversation.id, repeats: expect.stringContaining("day") },
      { instruction: "Later" },
    ]);
    await bench.close();
  });

  it.each([
    ["both times", { delaySeconds: 60, at: "2027-01-01T00:00:00Z" }],
    ["no time", {}],
    ["a time without a zone", { at: "2027-01-01T00:00:00" }],
    ["a past time", { at: "2020-01-01T00:00:00Z" }],
    ["a time too far away", { at: "2999-01-01T00:00:00Z" }],
    ["an unknown zone", { delaySeconds: 60, repeat: { unit: "day", interval: 1, timezone: "Mars/Base" } }],
    ["repeating too often", { delaySeconds: 60, repeat: { unit: "minute", interval: 1, timezone: "UTC" } }],
  ])("refuses %s", async (_name, times) => {
    const bench = await open();
    expect(await bench.call("schedule", { instruction: "Do it", ...times })).toMatchObject({ isError: true });
    expect(await listSchedules(bench.harness, context)).toEqual([]);
    await bench.close();
  });
});
