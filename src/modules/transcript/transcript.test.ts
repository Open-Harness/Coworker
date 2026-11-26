import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConversationTranscript } from "@earendil-works/pi-durable";
import { context, ToolBench } from "../../../test/engine.ts";
import { attributedText, AuthoredEntry, buildChatView, withoutAttribution } from "./service.ts";
import type { ChatView } from "./types.ts";
import { documentTools } from "~/modules/documents/service.ts";

const amina = { id: "guest:1", name: "Amina" };
let bench: ToolBench;
beforeEach(async () => {
  bench = await ToolBench.open(documentTools);
});
afterEach(() => bench.close());

/** What a page that just opened the chat would draw. */
async function view(): Promise<ChatView> {
  const watch = await bench.conversation.watch(context);
  const transcript = new ConversationTranscript(async () => ({ items: [] }));
  const drawn = buildChatView(transcript.merge(watch.value));
  await watch.stop();
  return drawn;
}

async function write(text: string): Promise<void> {
  const submission = await bench.conversation.submit(
    {
      type: "input",
      content: attributedText(amina, text),
      entry: { kind: AuthoredEntry.kind, data: { author: amina } },
      whenBusy: "followUp",
    },
    context,
  );
  await submission.wait(context);
}

describe("the view of a chat", () => {
  it("shows who wrote what, without the name the model reads", async () => {
    await write("Hello [there]");
    const { blocks, running, queued } = await view();
    expect({ running, queued }).toEqual({ running: false, queued: [] });
    expect(blocks).toMatchObject([
      { kind: "prompt", author: amina, text: "Hello [there]" },
      { kind: "answer", text: "done", calls: [] },
    ]);
  });

  it("puts each tool's result in its call", async () => {
    await bench.call("write_document", { title: "Plan", content: "one" });
    await bench.call("read_document", { documentId: "doc-404" });
    const calls = (await view()).blocks.flatMap((block) => (block.kind === "answer" ? block.calls : []));
    expect(calls).toMatchObject([
      { name: "write_document", status: "complete", args: { title: "Plan" }, details: { version: 1 } },
      { name: "read_document", status: "error" },
    ]);
  });

  it("names the author of what has no record of one", async () => {
    await bench.say("[Bo]\nHi");
    await bench.say("Plain");
    const prompts = (await view()).blocks.filter(({ kind }) => kind === "prompt");
    expect(prompts).toMatchObject([
      { author: { name: "Bo" }, text: "Hi" },
      { author: { name: "Someone" }, text: "Plain" },
    ]);
  });

  it("takes off only the attribution in front", () => {
    expect(withoutAttribution("[Bo]\n[not a name]\nHi")).toBe("[not a name]\nHi");
    expect(withoutAttribution("[x] on one line")).toBe("[x] on one line");
  });
});
