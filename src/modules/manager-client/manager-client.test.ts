import { describe, expect, it, vi } from "vitest";
import { connect } from "~/modules/connection/service.ts";
import { expectOk, joinDirectory, newChat } from "../../../test/client.ts";
import { TestSocket } from "../../../test/socket.ts";
import { createWorkspaceClient } from "./service.ts";
import type { WorkspaceClient } from "./types.ts";

/** A page in a workspace on the real server. */
async function page(workspaceId: string, name: string) {
  const socket = new TestSocket(`/api/workspaces/${workspaceId}/socket`, name);
  const client = createWorkspaceClient({ workspaceId, connect, open: () => socket, onError: () => {} });
  await socket.connect();
  await vi.waitFor(() => expect(client.state.get().status).toBe("connected"));
  return { socket, client };
}
async function room() {
  const directory = await joinDirectory("Amina");
  const { workspaceId, chatId } = await newChat(directory);
  return { directory, workspaceId, chatId, ...(await page(workspaceId, "Amina")) };
}
const texts = (client: WorkspaceClient, chatId: number): string[] =>
  (client.state.get().chats[chatId]?.blocks ?? []).flatMap((block) =>
    block.kind === "prompt" || block.kind === "answer" ? [block.text] : [],
  );
const waitForTexts = (client: WorkspaceClient, chatId: number, expected: string[]) =>
  vi.waitFor(
    () => {
      expect(texts(client, chatId)).toEqual(expected);
      expect(client.state.get().chats[chatId]?.running).toBe(false);
    },
    { timeout: 15_000 },
  );

describe("the workspace client", () => {
  it("shows a conversation as it happens, and what another person adds", async () => {
    const { client, workspaceId, chatId } = await room();
    const other = await page(workspaceId, "Bo");
    client.openChat(chatId);
    other.client.openChat(chatId);
    expect(await client.submit(chatId, "One", "followUp")).toEqual({ ok: true, value: undefined });
    await waitForTexts(other.client, chatId, ["One", "You said: One"]);
    await other.client.submit(chatId, "Two", "followUp");
    await waitForTexts(client, chatId, ["One", "You said: One", "Two", "You said: Two"]);
    client.close();
    other.client.close();
  });

  it("catches up after a drop, and delivers what was typed while offline once", async () => {
    const { client, socket, workspaceId, chatId } = await room();
    const other = await page(workspaceId, "Bo");
    client.openChat(chatId);
    await client.submit(chatId, "One", "followUp");
    await waitForTexts(client, chatId, ["One", "You said: One"]);
    socket.drop();
    expect(client.state.get().status).toBe("connecting");
    const offline = client.submit(chatId, "Three", "followUp");
    expect(await client.search("One")).toMatchObject({ ok: false, error: { code: "unavailable" } });
    other.client.openChat(chatId);
    await other.client.submit(chatId, "Two", "followUp");
    await waitForTexts(other.client, chatId, ["One", "You said: One", "Two", "You said: Two"]);
    await socket.connect();
    expect(await offline).toEqual({ ok: true, value: undefined });
    await waitForTexts(client, chatId, ["One", "You said: One", "Two", "You said: Two", "Three", "You said: Three"]);
    expect(socket.sent.findLast(({ type }) => type === "chat.open")).toHaveProperty("after");
    client.close();
    other.client.close();
  });

  it("shows who is here and typing, until they send or leave", async () => {
    const { client, workspaceId, chatId } = await room();
    const { client: other } = await page(workspaceId, "Bo");
    client.openChat(chatId);
    other.openChat(chatId);
    const bo = () => client.state.get().workspace?.presence.find(({ person }) => person.name === "Bo");
    await vi.waitFor(() => expect(bo()).toMatchObject({ chatId, typing: false }));
    other.setTyping(chatId, true);
    await vi.waitFor(() => expect(bo()?.typing).toBe(true));
    await other.submit(chatId, "Hi", "followUp");
    await vi.waitFor(() => expect(bo()?.typing).toBe(false));
    other.setTyping(chatId, true);
    await vi.waitFor(() => expect(bo()?.typing).toBe(true));
    other.leaveChat(chatId);
    await vi.waitFor(() => expect(bo()?.chatId).toBeUndefined());
    other.close();
    await vi.waitFor(() => expect(bo()).toBeUndefined());
    client.close();
  });

  it("loads earlier messages page by page", async () => {
    const { client, workspaceId, chatId } = await room();
    client.openChat(chatId);
    for (let turn = 0; turn < 30; turn += 1) {
      await client.submit(chatId, `Turn ${turn}`, "followUp");
      await vi.waitFor(() => expect(texts(client, chatId).at(-1)).toBe(`You said: Turn ${turn}`), { timeout: 10_000 });
    }
    const late = await page(workspaceId, "Bo");
    late.client.openChat(chatId);
    await vi.waitFor(() => expect(late.client.state.get().chats[chatId]?.blocks[0]?.kind).toBe("earlier"));
    while (late.client.state.get().chats[chatId]?.blocks[0]?.kind === "earlier") {
      expect(await late.client.loadEarlier(chatId)).toMatchObject({ ok: true });
    }
    expect(texts(late.client, chatId)).toHaveLength(60);
    expect(texts(late.client, chatId)[0]).toBe("Turn 0");
    client.close();
    late.client.close();
  });

  it("notices a chat that someone deletes", async () => {
    const { client, directory, workspaceId, chatId } = await room();
    client.openChat(chatId);
    await vi.waitFor(() => expect(client.state.get().chats[chatId]).toBeDefined());
    expectOk(await directory.send({ type: "chat.delete", workspaceId, chatId }));
    await vi.waitFor(() => expect(client.state.get().closed).toContain(chatId));
    client.close();
  });
});
