import { describe, expect, it } from "vitest";
import { expectOk, joinAdmin, joinDirectory, joinWorkspace, newChat, type DirectoryClient } from "../../../test/client.ts";
import { chatView, lastAnswer, untilView } from "../../../test/view.ts";
import { BLANK_AGENT } from "~/modules/agent-config/service.ts";
import type { AgentRow } from "~/modules/agent-config/types.ts";
import { newId } from "~/modules/protocol/service.ts";

const config = { ...BLANK_AGENT, name: "Researcher", system: "Cite everything.", tools: ["web"] as const };
const save = (admin: DirectoryClient, agentId: string, basedOn: number, change = {}) =>
  admin.send({ type: "agent.save", agentId, basedOn, config: { ...config, ...change } });
const snapshot = (client: DirectoryClient) =>
  client.until("the snapshot", (event) => (event.type === "directory.snapshot" ? event : undefined));
const lastSeen = (client: DirectoryClient, agentId: string): AgentRow | undefined => {
  const event = client.events.findLast((seen) => seen.type === "agent.changed" && seen.agent.id === agentId);
  return event?.type === "agent.changed" ? event.agent : undefined;
};
async function deployed(admin: DirectoryClient, change = {}): Promise<string> {
  const agentId = newId();
  expectOk(await save(admin, agentId, 0, change));
  expectOk(await admin.send({ type: "agent.deploy", agentId, version: 1, to: "all" }));
  return agentId;
}
async function chatWith(client: DirectoryClient, workspaceId: string, agentId: string): Promise<number> {
  const output = expectOk(await client.send({ type: "chat.create", workspaceId, agentId }));
  if (output.kind !== "chat") throw new Error("No chat");
  return output.chatId;
}

describe("who may change agents", () => {
  it("is an administrator, and nobody else", async () => {
    const guest = await joinDirectory("Bo");
    expect(await snapshot(guest)).toMatchObject({ isAdmin: false });
    expect(await snapshot(await joinAdmin())).toMatchObject({ isAdmin: true });
    expect(await save(guest, newId(), 0)).toMatchObject({ ok: false, error: { code: "forbidden" } });
    expect(await guest.send({ type: "agent.draft", description: "x" })).toMatchObject({ error: { code: "forbidden" } });
  });
});

describe("versions", () => {
  it("are kept, and shown to everyone", async () => {
    const [admin, bo] = [await joinAdmin(), await joinDirectory("Bo")];
    const agentId = newId();
    expectOk(await save(admin, agentId, 0));
    expectOk(await save(admin, agentId, 1, { system: "Be brief." }));
    const row = await bo.until("version 2", (event) =>
      event.type === "agent.changed" && event.agent.id === agentId && event.agent.version === 2 ? event.agent : undefined,
    );
    expect(row).toMatchObject({ config: { system: "Be brief." }, versions: [{ version: 2 }, { version: 1 }] });
    expect(row).not.toHaveProperty("deployment");
    const first = expectOk(await admin.send({ type: "agent.read", agentId, version: 1 }));
    expect(first).toEqual({ kind: "agent", config });
    const later = await snapshot(await joinDirectory("Cleo"));
    expect(later.agents.find(({ id }) => id === agentId)).toEqual(row);
  });

  it("are never saved over someone else's, nor twice for one request", async () => {
    const admin = await joinAdmin();
    const agentId = newId();
    const requestId = newId();
    const command = { type: "agent.save", agentId, basedOn: 0, config } as const;
    expectOk(await admin.send(command, requestId));
    expectOk(await (await joinAdmin()).send(command, requestId));
    expect(lastSeen(admin, agentId)?.version).toBe(1);
    expect(await save(admin, agentId, 0)).toMatchObject({ ok: false, error: { code: "conflict" } });
  });

  it("cannot be added to a deleted agent", async () => {
    const admin = await joinAdmin();
    const agentId = await deployed(admin);
    expectOk(await admin.send({ type: "agent.delete", agentId }));
    expect(await save(admin, agentId, 1)).toMatchObject({ error: { code: "not_found" } });
    expect((await snapshot(await joinAdmin())).agents.some(({ id }) => id === agentId)).toBe(false);
  });
});

describe("a deployed agent", () => {
  it("answers in new chats, with its own prompt, tools and version", async () => {
    const [admin, bo] = [await joinAdmin(), await joinDirectory("Bo")];
    const agentId = await deployed(admin);
    const { workspaceId } = await newChat(bo);
    const chatId = await chatWith(bo, workspaceId, agentId);
    const client = await joinWorkspace(workspaceId, "Bo");
    const row = await bo.until("the chat", (event) =>
      event.type === "workspace.changed" ? event.workspace.chats.find(({ id, agent }) => id === chatId && agent !== undefined) : undefined,
    );
    expect(row.agent).toEqual({ id: agentId, name: "Researcher", version: 1 });
    expectOk(await client.send({ type: "chat.open", chatId }));
    // The scripted model tries to write a document, which this agent cannot.
    expectOk(await client.send({ type: "prompt.submit", chatId, content: "Write a document", whenBusy: "followUp" }));
    await untilView(client, chatId, "an answer", lastAnswer);
    const calls = chatView(client, chatId)?.blocks.flatMap((block) => (block.kind === "answer" ? block.calls : []));
    expect(calls).toMatchObject([{ name: "write_document", status: "error" }]);
    const model = { provider: "fake", modelId: "scripted-thinker" };
    expect(await client.send({ type: "chat.configure", chatId, model })).toMatchObject({ error: { code: "rejected" } });
  });

  it("keeps the version a chat began with when another is deployed", async () => {
    const [admin, bo] = [await joinAdmin(), await joinDirectory("Bo")];
    const agentId = await deployed(admin);
    const { workspaceId } = await newChat(bo);
    const before = await chatWith(bo, workspaceId, agentId);
    expectOk(await save(admin, agentId, 1, { name: "Scholar" }));
    expectOk(await admin.send({ type: "agent.deploy", agentId, version: 2, to: "all" }));
    const after = await chatWith(bo, workspaceId, agentId);
    const { workspaces } = await snapshot(await joinDirectory("Cleo"));
    const chats = workspaces.find(({ id }) => id === workspaceId)?.chats ?? [];
    expect(chats.find(({ id }) => id === before)?.agent).toMatchObject({ name: "Researcher", version: 1 });
    expect(chats.find(({ id }) => id === after)?.agent).toMatchObject({ name: "Scholar", version: 2 });
  });

  it("is there only where it was deployed, and until it is retired", async () => {
    const [admin, bo] = [await joinAdmin(), await joinDirectory("Bo")];
    const agentId = await deployed(admin);
    const here = (await newChat(bo)).workspaceId;
    const elsewhere = (await newChat(bo)).workspaceId;
    expectOk(await admin.send({ type: "agent.deploy", agentId, version: 1, to: [here] }));
    await chatWith(bo, here, agentId);
    const refused = { ok: false, error: { code: "rejected" } };
    expect(await bo.send({ type: "chat.create", workspaceId: elsewhere, agentId })).toMatchObject(refused);
    expectOk(await admin.send({ type: "agent.retire", agentId }));
    expect(await bo.send({ type: "chat.create", workspaceId: here, agentId })).toMatchObject(refused);
  });

  it("needs a model and a version that exist", async () => {
    const admin = await joinAdmin();
    const agentId = newId();
    expectOk(await save(admin, agentId, 0, { model: { provider: "gone", modelId: "model" } }));
    expect(await admin.send({ type: "agent.deploy", agentId, version: 1, to: "all" })).toMatchObject({ error: { code: "rejected" } });
    expect(await admin.send({ type: "agent.deploy", agentId, version: 9, to: "all" })).toMatchObject({ error: { code: "not_found" } });
  });
});

describe("drafting", () => {
  it("turns a description into a config to check", async () => {
    const admin = await joinAdmin();
    const output = expectOk(await admin.send({ type: "agent.draft", description: "Summarizes news" }));
    expect(output).toMatchObject({
      kind: "agent",
      config: { name: "Drafted agent", tools: ["web"], system: "You do this: Summarizes news" },
    });
  });
});
