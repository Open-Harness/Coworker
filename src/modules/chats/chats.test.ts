import type { EntryId } from "@earendil-works/pi-durable";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { context, ToolBench } from "../../../test/engine.ts";
import { chats } from "./service.ts";
import type { ChatResult } from "./types.ts";

const by = { id: "guest:1", name: "Amina" };
let bench: ToolBench;
beforeEach(async () => {
  bench = await ToolBench.open([]);
});
afterEach(() => bench.close());

const create = (requestId: string) => bench.harness.commit((tx) => chats.create(tx, { requestId, by, now: 10 }), context);
const list = () => bench.harness.commit((tx) => chats.list(tx), context);
const find = (chatId: number) => bench.harness.commit((tx) => chats.find(tx, chatId), context);
function idOf(result: ChatResult<number>): number {
  if (!result.ok) throw new Error(result.message);
  return result.value;
}

describe("chats", () => {
  it("creates one chat however often a request arrives", async () => {
    const before = (await list()).length;
    expect(idOf(await create("a"))).toBe(idOf(await create("a")));
    expect(idOf(await create("b"))).not.toBe(idOf(await create("a")));
    expect(await list()).toHaveLength(before + 2);
  });

  it("takes its title from the first prompt, unless it was named", async () => {
    const id = idOf(await create("a"));
    const note = (text: string, now: number) => bench.harness.commit((tx) => chats.notePrompt(tx, id, text, now), context);
    const row = async () => (await list()).find((chat) => chat.id === id);
    await note("Plan the launch\nwith details", 20);
    expect(await row()).toMatchObject({ title: "Plan the launch", updatedAt: 20, createdBy: "Amina" });
    await note("Something else", 30);
    expect(await row()).toMatchObject({ title: "Plan the launch", updatedAt: 30 });
    await bench.harness.commit((tx) => chats.update(tx, id, { title: " Launch ", pinned: true, archived: true }, 40), context);
    expect(await row()).toMatchObject({ title: "Launch", pinned: true, archivedAt: 40 });
    await bench.harness.commit((tx) => chats.update(tx, id, { archived: false }, 50), context);
    expect(await row()).not.toHaveProperty("archivedAt");
  });

  it("forgets a deleted chat", async () => {
    const id = idOf(await create("a"));
    await bench.harness.commit((tx) => chats.remove(tx, id, 20), context);
    expect(await find(id)).toMatchObject({ ok: false, reason: "not_found" });
    expect((await list()).some((chat) => chat.id === id)).toBe(false);
    const again = await bench.harness.commit((tx) => chats.remove(tx, id, 30), context);
    expect(again).toMatchObject({ ok: false, reason: "not_found" });
  });

  it("forks from a message, once per request, and only with that request", async () => {
    await bench.say("Hello");
    const source = bench.conversation.id;
    const entries = await bench.harness.commit((tx) => tx.scanEntries({ conversationId: source }, 10), context);
    const entryId = entries.items[0]!.id;
    const fork = (requestId: string, from: EntryId) =>
      bench.harness.commit((tx) => chats.fork(tx, { requestId, by, now: 20, chatId: source, entryId: from }), context);
    const forked = idOf(await fork("f", entryId));
    expect(idOf(await fork("f", entryId))).toBe(forked);
    expect(await fork("f", entries.items[1]!.id)).toMatchObject({ ok: false, reason: "request_reused" });
    expect((await list()).find((chat) => chat.id === forked)).toMatchObject({ parentId: source });
    expect(await create("f")).toMatchObject({ ok: false, reason: "request_reused" });
  });
});
