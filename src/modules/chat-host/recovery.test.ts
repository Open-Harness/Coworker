import { evictDurableObject, runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { expectOk, joinDirectory, joinWorkspace, newChat } from "../../../test/client.ts";
import { chatView, lastAnswer, untilView } from "../../../test/view.ts";

const { WORKSPACES } = env as unknown as { WORKSPACES: DurableObjectNamespace };

async function room() {
  const directory = await joinDirectory("Amina");
  const { workspaceId, chatId } = await newChat(directory);
  const client = await joinWorkspace(workspaceId, "Amina");
  expectOk(await client.send({ type: "chat.open", chatId }));
  return { workspaceId, chatId, client, stub: WORKSPACES.getByName(workspaceId) };
}
const prompt = (chatId: number, content: string) => ({ type: "prompt.submit", chatId, content, whenBusy: "followUp" }) as const;

describe("a workspace whose process dies", () => {
  it("keeps what was said", async () => {
    const { workspaceId, chatId, client, stub } = await room();
    expectOk(await client.send(prompt(chatId, "Remember me")));
    await untilView(client, chatId, "the answer", lastAnswer);
    await evictDurableObject(stub);
    const back = await joinWorkspace(workspaceId, "Amina");
    expectOk(await back.send({ type: "chat.open", chatId }));
    expect(await untilView(back, chatId, "the answer", lastAnswer)).toBe("You said: Remember me");
  });

  it("is woken by its alarm and settles the run nobody is watching", async () => {
    const { workspaceId, chatId, client, stub } = await room();
    expectOk(await client.send(prompt(chatId, "slow please")));
    await untilView(client, chatId, "streaming", (view) => (view.streaming?.text ? true : undefined));
    const alarm = await runInDurableObject(stub, (_instance, state) => state.storage.getAlarm());
    expect(alarm).not.toBeNull();
    // Unlike an eviction, an abort does not wait for the run: this is the process dying.
    await runInDurableObject(stub, (_instance, state) => state.abort("killed")).catch(() => undefined);
    expect(await runDurableObjectAlarm(WORKSPACES.getByName(workspaceId))).toBe(true);
    const back = await joinWorkspace(workspaceId, "Amina");
    expectOk(await back.send({ type: "chat.open", chatId }));
    // The engine runs the interrupted generation again: the answer is written, or the interruption is reported.
    await untilView(back, chatId, "the end of the run", (view) =>
      !view.running && (lastAnswer(view) !== undefined || view.failure !== undefined) ? true : undefined,
    );
  });

  it("leaves no alarm behind when nothing is left to do", async () => {
    const { chatId, client, stub } = await room();
    expectOk(await client.send(prompt(chatId, "Quick")));
    await untilView(client, chatId, "the answer", lastAnswer);
    await expect.poll(() => runInDurableObject(stub, (_instance, state) => state.storage.getAlarm()), { timeout: 5_000 }).toBeNull();
  });

  it("continues a transcript from the entry the page already has", async () => {
    const { workspaceId, chatId, client } = await room();
    expectOk(await client.send(prompt(chatId, "One")));
    await untilView(client, chatId, "the answer", lastAnswer);
    const after = Math.max(...chatView(client, chatId)!.blocks.flatMap((block) => ("id" in block ? [block.id] : [])));
    expectOk(await client.send(prompt(chatId, "Two")));
    await untilView(client, chatId, "the second answer", (view) => (lastAnswer(view) === "You said: Two" ? true : undefined));
    const back = await joinWorkspace(workspaceId, "Amina");
    expectOk(await back.send({ type: "chat.open", chatId, after }));
    const view = await back.until("the view", (event) => (event.type === "chat.view" ? event.view : undefined));
    expect(view.entries.every(({ id }) => id > after)).toBe(true);
  });
});
