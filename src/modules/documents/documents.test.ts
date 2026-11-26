import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { context, ToolBench } from "../../../test/engine.ts";
import { documents, documentTools } from "./service.ts";

let bench: ToolBench;
beforeEach(async () => {
  bench = await ToolBench.open(documentTools);
});
afterEach(() => bench.close());

const write = (content: string, more: Record<string, string> = {}) => bench.call("write_document", { title: "Plan", content, ...more });
const idOf = async () => (await documents.list(bench.harness, context))[0]?.id ?? "";
const contentOf = async (version?: number) => (await documents.read(bench.harness, await idOf(), version, context))?.content;

describe("documents", () => {
  it("keeps every version of what the assistant writes", async () => {
    expect(await write("one")).toMatchObject({ isError: false, details: { version: 1, title: "Plan" } });
    expect(await write("two", { documentId: await idOf() })).toMatchObject({ details: { version: 2 } });
    expect(await documents.list(bench.harness, context)).toMatchObject([
      { title: "Plan", language: "markdown", version: 2, versions: [1, 2], chatId: bench.conversation.id },
    ]);
    expect(await contentOf()).toBe("two");
    expect(await contentOf(1)).toBe("one");
    expect(await contentOf(3)).toBeUndefined();
  });

  it("edits one exact passage, and refuses when it is missing or not unique", async () => {
    await write("red green red");
    const documentId = await idOf();
    const edit = (find: string) => bench.call("edit_document", { documentId, find, replace: "blue" });
    expect(await edit("green")).toMatchObject({ isError: false, details: { version: 2 } });
    expect(await contentOf()).toBe("red blue red");
    expect(await edit("red")).toMatchObject({ isError: true, text: expect.stringContaining("more than once") });
    expect(await edit("gone")).toMatchObject({ isError: true, text: expect.stringContaining("not found") });
    expect((await documents.list(bench.harness, context))[0]?.version).toBe(2);
  });

  it("keeps the latest twenty versions", async () => {
    await write("v1");
    const documentId = await idOf();
    for (let version = 2; version <= 22; version += 1) await write(`v${version}`, { documentId });
    const [row] = await documents.list(bench.harness, context);
    expect(row?.versions).toHaveLength(20);
    expect(row?.versions[0]).toBe(3);
    expect(await contentOf(2)).toBeUndefined();
    expect(await contentOf(22)).toBe("v22");
  });

  it("refuses to replace a document that does not exist, and one that is too long", async () => {
    expect(await write("x", { documentId: "doc-404" })).toMatchObject({ isError: true });
    expect(await write("x".repeat(150_001))).toMatchObject({ isError: true });
    expect(await documents.list(bench.harness, context)).toEqual([]);
  });

  it("lets the assistant list and read", async () => {
    await write("text", { language: "typescript" });
    const documentId = await idOf();
    expect((await bench.call("read_document", {})).text).toBe(JSON.stringify([{ documentId, title: "Plan", language: "typescript" }]));
    expect((await bench.call("read_document", { documentId })).text).toBe("text");
  });
});
