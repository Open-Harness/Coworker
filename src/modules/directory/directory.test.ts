import { evictDurableObject, runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { newId } from "~/modules/protocol/service.ts";
import { expectOk, joinDirectory, joinWorkspace, newChat, type DirectoryClient } from "../../../test/client.ts";
import { DIRECTORY_NAME } from "./service.ts";

const { DIRECTORY } = env as unknown as { DIRECTORY: DurableObjectNamespace };

const snapshot = (client: DirectoryClient) =>
  client.until("the snapshot", (event) => (event.type === "directory.snapshot" ? event : undefined));
const lastRow = (client: DirectoryClient, id: string) =>
  client.events.findLast((event) => event.type === "workspace.changed" && event.workspace.id === id);

describe("the directory", () => {
  it("shows a new workspace to everyone, and to whoever comes later", async () => {
    const amina = await joinDirectory("Amina");
    const bo = await joinDirectory("Bo");
    const { workspaceId, chatId } = await newChat(amina);
    const seen = await bo.until("the chat", (event) =>
      event.type === "workspace.changed" && event.workspace.id === workspaceId && event.workspace.chats.length > 0
        ? event.workspace
        : undefined,
    );
    expect(seen).toMatchObject({ name: "Team", createdBy: "Amina", chats: [{ id: chatId, status: "idle", title: "New chat" }] });
    const later = await snapshot(await joinDirectory("Cleo"));
    expect(later.workspaces.find(({ id }) => id === workspaceId)).toEqual(seen);
    expect(later.models).not.toHaveLength(0);
  });

  it("creates a workspace once, however often it is asked", async () => {
    const client = await joinDirectory("Amina");
    const workspaceId = newId();
    expectOk(await client.send({ type: "workspace.create", workspaceId, name: "One" }));
    expectOk(await client.send({ type: "workspace.create", workspaceId, name: "Two" }));
    const { workspaces } = await snapshot(await joinDirectory("Bo"));
    expect(workspaces.filter(({ id }) => id === workspaceId)).toMatchObject([{ name: "One" }]);
  });

  it("creates a chat once per request", async () => {
    const client = await joinDirectory("Amina");
    const { workspaceId } = await newChat(client);
    const requestId = newId();
    const first = expectOk(await client.send({ type: "chat.create", workspaceId }, requestId));
    const other = await joinDirectory("Amina");
    expect(expectOk(await other.send({ type: "chat.create", workspaceId }, requestId))).toEqual(first);
  });

  it("renames, pins and archives workspaces and chats", async () => {
    const client = await joinDirectory("Amina");
    const { workspaceId, chatId } = await newChat(client);
    expectOk(await client.send({ type: "workspace.update", workspaceId, change: { title: "Core", pinned: true, archived: true } }));
    expect(lastRow(client, workspaceId)).toMatchObject({ workspace: { name: "Core", pinned: true, archivedAt: expect.any(Number) } });
    expectOk(await client.send({ type: "workspace.update", workspaceId, change: { archived: false } }));
    expect(lastRow(client, workspaceId)).not.toHaveProperty("workspace.archivedAt");
    expectOk(await client.send({ type: "chat.update", workspaceId, chatId, change: { title: "Plans", pinned: true } }));
    await client.until("the chat's new title", (event) =>
      event.type === "workspace.changed" && event.workspace.chats.some(({ title, pinned }) => title === "Plans" && pinned)
        ? true
        : undefined,
    );
    const room = await joinWorkspace(workspaceId, "Amina");
    await room.until("the workspace's new name", (event) =>
      event.type === "workspace.snapshot" && event.state.name === "Core" ? true : undefined,
    );
  });

  it("deletes a workspace: hidden, disconnected, erased, and its id is not reused", async () => {
    const client = await joinDirectory("Amina");
    const { workspaceId } = await newChat(client);
    const room = await joinWorkspace(workspaceId, "Bo");
    expectOk(await client.send({ type: "workspace.delete", workspaceId }));
    await client.until("the removal", (event) =>
      event.type === "workspace.removed" && event.workspaceId === workspaceId ? true : undefined,
    );
    expect(await room.settle("the close", () => room.closed)).toBe(4404);
    const visitor = await joinWorkspace(workspaceId, "Cleo");
    expect(await visitor.settle("the close", () => visitor.closed)).toBe(4404);
    expect(await client.send({ type: "workspace.create", workspaceId, name: "Again" })).toMatchObject({ ok: false });
    expect(await client.send({ type: "chat.create", workspaceId })).toMatchObject({ ok: false, error: { code: "not_found" } });
  });

  it("finishes, from its alarm, a creation that was cut short", async () => {
    const client = await joinDirectory("Amina");
    await snapshot(client);
    const workspaceId = newId();
    const stub = DIRECTORY.getByName(DIRECTORY_NAME);
    await runInDurableObject(stub, (_instance, state) => {
      state.storage.sql.exec(
        "INSERT INTO workspaces (id, name, phase, created_at, updated_at, created_by, chats, documents) VALUES (?, 'Half made', 'provisioning', 1, 1, 'Amina', '[]', '[]')",
        workspaceId,
      );
    });
    await evictDurableObject(stub);
    const back = await joinDirectory("Amina");
    expect((await snapshot(back)).workspaces.some(({ id }) => id === workspaceId)).toBe(false);
    expect(await runDurableObjectAlarm(stub)).toBe(true);
    const later = await snapshot(await joinDirectory("Bo"));
    expect(later.workspaces.find(({ id }) => id === workspaceId)).toMatchObject({ name: "Half made" });
    const room = await joinWorkspace(workspaceId, "Bo");
    await room.until("the snapshot", (event) => (event.type === "workspace.snapshot" ? true : undefined));
  });

  it("ignores a projection older than the one it has", async () => {
    const client = await joinDirectory("Amina");
    const { workspaceId, chatId } = await newChat(client);
    const stub = DIRECTORY.getByName(DIRECTORY_NAME);
    const stale = { workspaceId, sequence: 1, chats: [], documents: [] };
    await stub.fetch("https://internal/internal/publish", { method: "POST", body: JSON.stringify(stale) });
    const { workspaces } = await snapshot(await joinDirectory("Bo"));
    expect(workspaces.find(({ id }) => id === workspaceId)?.chats.map(({ id }) => id)).toEqual([chatId]);
  });

  it("lists people once, however many pages they have open", async () => {
    const one = await joinDirectory("Dede");
    const two = await joinDirectory("Dede");
    const { people } = await snapshot(two);
    expect(people.filter(({ name }) => name === "Dede")).toHaveLength(1);
    one.close();
    two.close();
  });
});
