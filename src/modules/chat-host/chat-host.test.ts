import { describe, expect, it } from "vitest";
import { addChat, expectOk, joinDirectory, joinWorkspace, newChat, say } from "../../../test/client.ts";
import { chatView, lastAnswer, untilView } from "../../../test/view.ts";
import { newId } from "~/modules/protocol/service.ts";

async function room(name = "Amina") {
  const directory = await joinDirectory(name);
  const { workspaceId, chatId } = await newChat(directory);
  const client = await joinWorkspace(workspaceId, name);
  expectOk(await client.send({ type: "chat.open", chatId }));
  return { directory, workspaceId, chatId, client };
}
const prompt = (chatId: number, content: string, whenBusy: "followUp" | "steer" = "followUp") =>
  ({ type: "prompt.submit", chatId, content, whenBusy }) as const;

describe("a chat", () => {
  it("answers a prompt, with its author, and titles itself", async () => {
    const { client, chatId, directory, workspaceId } = await room();
    expectOk(await client.send(prompt(chatId, "Hello there")));
    expect(await untilView(client, chatId, "an answer", lastAnswer)).toBe("You said: Hello there");
    expect(chatView(client, chatId)?.blocks[0]).toMatchObject({
      kind: "prompt",
      text: "Hello there",
      author: { name: "Amina", id: "email:amina@example.test" },
    });
    const title = await directory.until("the title", (event) =>
      event.type === "workspace.changed" && event.workspace.id === workspaceId
        ? event.workspace.chats.find(({ title }) => title === "Hello there")?.title
        : undefined,
    );
    expect(title).toBe("Hello there");
  });

  it("shows one person's prompt and the answer to everyone", async () => {
    const { client, chatId, workspaceId } = await room();
    const other = await joinWorkspace(workspaceId, "Bo");
    expectOk(await other.send({ type: "chat.open", chatId }));
    expectOk(await client.send(prompt(chatId, "Hello from Amina")));
    expect(await untilView(other, chatId, "the answer", lastAnswer)).toBe("You said: Hello from Amina");
    await untilView(client, chatId, "the answer", lastAnswer);
    expect(chatView(other, chatId)?.blocks).toEqual(chatView(client, chatId)?.blocks);
  });

  it("accepts a replayed prompt once", async () => {
    const { client, chatId } = await room();
    const requestId = newId();
    const first = await client.send(prompt(chatId, "Only once"), requestId);
    client.events.length = client.events.findIndex((event) => event.type === "command.result" && event.requestId === requestId);
    expect(await client.send(prompt(chatId, "Only once"), requestId)).toEqual({ ...first, requestId, type: "command.result" });
    const again = await joinWorkspace((await snapshotOf(client)).workspaceId, "Bo");
    expectOk(await again.send({ type: "chat.open", chatId }));
    await untilView(again, chatId, "the answer", lastAnswer);
    expect(chatView(again, chatId)?.blocks.filter(({ kind }) => kind === "prompt")).toHaveLength(1);
  });

  it("queues a prompt behind a running answer, and lets it be withdrawn", async () => {
    const { client, chatId } = await room();
    expectOk(await client.send(prompt(chatId, "slow please")));
    await untilView(client, chatId, "the run", (view) => (view.running ? true : undefined));
    const queued = expectOk(await client.send(prompt(chatId, "Next thing")));
    if (queued.kind !== "submitted") throw new Error("not submitted");
    await untilView(client, chatId, "the queue", (view) => (view.queued[0]?.text === "Next thing" ? true : undefined));
    expectOk(await client.send({ type: "prompt.withdraw", chatId, submissionId: queued.submissionId }));
    await untilView(client, chatId, "an empty queue", (view) => (view.queued.length === 0 ? true : undefined));
    expectOk(await client.send({ type: "run.stop", chatId }));
    await untilView(client, chatId, "the stop", (view) => (view.running ? undefined : true));
  });

  it("stops a run and can continue it", async () => {
    const { client, chatId } = await room();
    expectOk(await client.send(prompt(chatId, "slow please")));
    await untilView(client, chatId, "streaming", (view) => (view.streaming?.text ? true : undefined));
    expectOk(await client.send({ type: "run.stop", chatId }));
    const failure = await untilView(client, chatId, "the stop", (view) => (view.running ? undefined : view.failure));
    expect(failure).toEqual({ message: "The run was stopped", canContinue: true, stopped: true });
  });

  it("answers what others have waiting once a run is stopped", async () => {
    const { client, chatId } = await room();
    expectOk(await client.send(prompt(chatId, "slow please")));
    await untilView(client, chatId, "streaming", (view) => (view.streaming?.text ? true : undefined));
    const other = await joinWorkspace((await snapshotOf(client)).workspaceId, "Bo");
    expectOk(await other.send(prompt(chatId, "Mine next")));
    await untilView(client, chatId, "the queue", (view) => (view.queued.length === 1 ? true : undefined));
    expectOk(await client.send({ type: "run.stop", chatId }));
    const texts = await untilView(client, chatId, "Bo's answer", (view) => {
      const answers = view.blocks.filter((block) => block.kind === "answer");
      return !view.running && answers.length === 2 ? answers : undefined;
    });
    expect(texts.map(({ end }) => end)).toEqual(["stopped", "finished"]);
    expect(texts[1]?.text).toBe("You said: Mine next");
  });

  it("reports a model failure with a way on", async () => {
    const { client, chatId, directory } = await room();
    expectOk(await client.send(prompt(chatId, "please fail")));
    const failure = await untilView(client, chatId, "the failure", (view) => (view.running ? undefined : view.failure));
    expect(failure.message).toContain("told to fail");
    await directory.until("the failed status", (event) =>
      event.type === "workspace.changed" && event.workspace.chats.some(({ status }) => status === "failed") ? true : undefined,
    );
  });

  it("forks at an entry, once per request", async () => {
    const { client, chatId } = await room();
    expectOk(await client.send(prompt(chatId, "First")));
    await untilView(client, chatId, "the answer", lastAnswer);
    const entryId = chatView(client, chatId)!.blocks.flatMap((block) => (block.kind === "answer" ? [block.id] : []))[0]!;
    const requestId = newId();
    const forked = expectOk(await client.send({ type: "chat.fork", chatId, entryId }, requestId));
    if (forked.kind !== "chat") throw new Error("not a chat");
    expectOk(await client.send({ type: "chat.open", chatId: forked.chatId }));
    expect(await untilView(client, forked.chatId, "the fork", lastAnswer)).toBe("You said: First");
    const reused = await client.send({ type: "chat.fork", chatId: forked.chatId, entryId }, requestId);
    expect(reused).toMatchObject({ ok: true, output: { chatId: forked.chatId } });
  });
});

const snapshotOf = (client: Awaited<ReturnType<typeof joinWorkspace>>) =>
  client.until("the snapshot", (event) => (event.type === "workspace.snapshot" ? event : undefined));

describe("a workspace", () => {
  it("refuses to exist before it is created", async () => {
    const stranger = await joinWorkspace(newId(), "Bo");
    expect(await stranger.settle("the close", () => stranger.closed)).toBe(4404);
  });

  it("shows who is where and who types", async () => {
    const { client, chatId, workspaceId } = await room();
    const other = await joinWorkspace(workspaceId, "Bo");
    expectOk(await other.send({ type: "chat.open", chatId }));
    say(other, { type: "presence.typing", chatId, typing: true });
    const bo = await client.until("Bo typing", (event) =>
      event.type === "workspace.patch" ? event.patch.presence?.find(({ person, typing }) => person.name === "Bo" && typing) : undefined,
    );
    expect(bo.chatId).toBe(chatId);
    client.events.length = 0;
    other.close();
    await client.until("Bo leaving", (event) =>
      event.type === "workspace.patch" && event.patch.presence?.every(({ person }) => person.name !== "Bo") ? true : undefined,
    );
  });

  it("writes a document everyone can read, with versions", async () => {
    const { client, chatId } = await room();
    expectOk(await client.send(prompt(chatId, "Write a document")));
    await untilView(client, chatId, "the answer", lastAnswer);
    const row = await client.until("the document", (event) => (event.type === "workspace.patch" ? event.patch.documents?.[0] : undefined));
    expect(row).toMatchObject({ title: "Release plan", version: 1, versions: [1], chatId });
    const read = expectOk(await client.send({ type: "document.read", documentId: row.id }));
    expect(read).toMatchObject({ kind: "document", document: { language: "markdown", version: 1 } });
    expect(await client.send({ type: "document.read", documentId: row.id, version: 9 })).toMatchObject({
      ok: false,
      error: { code: "not_found" },
    });
  });

  it("delivers a scheduled instruction", async () => {
    const { client, chatId } = await room();
    expectOk(await client.send(prompt(chatId, "Please schedule it")));
    await client.until("the schedule", (event) => (event.type === "workspace.patch" ? event.patch.schedules?.[0] : undefined));
    await untilView(client, chatId, "the delivery", (view) =>
      view.blocks.some((block) => block.kind === "scheduled" && block.instruction === "Say that the time has come") ? true : undefined,
    );
  });

  it("cancels a schedule, and nothing that is not one", async () => {
    const { client, chatId } = await room();
    expectOk(await client.send(prompt(chatId, "Please schedule it")));
    const { taskId } = await client.until("the schedule", (event) =>
      event.type === "workspace.patch" ? event.patch.schedules?.[0] : undefined,
    );
    expectOk(await client.send({ type: "task.cancel", taskId }));
    await client.until("no schedules", (event) =>
      event.type === "workspace.patch" && event.patch.schedules?.length === 0 ? true : undefined,
    );
    expect(await client.send({ type: "task.cancel", taskId })).toMatchObject({ ok: false, error: { code: "not_found" } });
  });

  it("refuses prompts beyond its budget", async () => {
    const { client, chatId } = await room();
    expectOk(await client.send({ type: "settings.update", change: { budgetUsd: 0 } }));
    expect(await client.send(prompt(chatId, "Hello"))).toMatchObject({ ok: false, error: { code: "budget_reached" } });
    expectOk(await client.send({ type: "settings.update", change: { budgetUsd: null } }));
    expectOk(await client.send(prompt(chatId, "Hello")));
  });

  it("refuses a model that has no provider", async () => {
    const { client, chatId } = await room();
    const model = { provider: "openai", modelId: "gpt-6-luna" };
    expect(await client.send({ type: "chat.configure", chatId, model })).toMatchObject({ ok: false, error: { code: "rejected" } });
    expect(await client.send({ type: "settings.update", change: { model } })).toMatchObject({ ok: false });
    expectOk(await client.send({ type: "chat.configure", chatId, model: { provider: "fake", modelId: "scripted-thinker" } }));
    await untilView(client, chatId, "the model", (view) => (view.model?.modelId === "scripted-thinker" ? true : undefined));
  });

  it("tells a page that sends nonsense, and keeps its socket", async () => {
    const { client, chatId } = await room();
    client.socket.send("{");
    client.socket.send(JSON.stringify({ type: "prompt.submit", requestId: "r", chatId: 1, content: "", whenBusy: "followUp" }));
    await client.settle("two errors", () => (client.events.filter(({ type }) => type === "error").length === 2 ? true : undefined));
    expectOk(await client.send(prompt(chatId, "Still here")));
  });

  it("closes a deleted chat for whoever has it open", async () => {
    const { client, chatId, directory, workspaceId } = await room();
    const second = await addChat(directory, workspaceId);
    expectOk(await directory.send({ type: "chat.delete", workspaceId, chatId }));
    await client.until("the close", (event) => (event.type === "chat.closed" && event.chatId === chatId ? true : undefined));
    expect(await client.send(prompt(chatId, "Hello?"))).toMatchObject({ ok: false, error: { code: "not_found" } });
    expectOk(await client.send({ type: "chat.open", chatId: second }));
  });
});
