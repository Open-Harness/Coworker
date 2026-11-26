import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { context, ToolBench } from "../../../test/engine.ts";
import { searchExtension, searchHistory, searchHistoryTool } from "./service.ts";
import { chats } from "~/modules/chats/service.ts";

let bench: ToolBench;
beforeEach(async () => {
  bench = await ToolBench.open([searchHistoryTool, ...(searchExtension.tools ?? [])]);
});
afterEach(() => bench.close());

const search = (term: string) => searchHistory(bench.harness, term, context);

describe("searching history", () => {
  it("finds what people and the assistant said, whatever the case", async () => {
    await bench.say("The launch is on FRIDAY");
    expect(await search("friday")).toMatchObject({
      truncated: false,
      matches: [{ chatId: bench.conversation.id, role: "user", snippet: "The launch is on FRIDAY" }],
    });
    expect((await search("done")).matches).toMatchObject([{ role: "assistant" }]);
    expect((await search("monday")).matches).toEqual([]);
    expect((await search("  ")).matches).toEqual([]);
  });

  it("shortens long messages around the match", async () => {
    await bench.say(`${"a".repeat(500)} needle ${"b".repeat(500)}`);
    const snippet = (await search("needle")).matches[0]?.snippet ?? "";
    expect(snippet.length).toBeLessThan(200);
    expect(snippet).toContain("needle");
    expect(snippet.startsWith("…") && snippet.endsWith("…")).toBe(true);
  });

  it("stops at twenty matches, newest first", async () => {
    for (let turn = 1; turn <= 21; turn += 1) await bench.say(`needle ${turn}`);
    const { matches, truncated } = await search("needle");
    expect(matches).toHaveLength(20);
    expect(truncated).toBe(true);
    expect(matches[0]?.snippet).toBe("needle 21");
  });

  it("does not find deleted chats", async () => {
    await bench.say("needle");
    await bench.harness.commit((tx) => chats.remove(tx, bench.conversation.id, 5), context);
    expect((await search("needle")).matches).toEqual([]);
  });
});
