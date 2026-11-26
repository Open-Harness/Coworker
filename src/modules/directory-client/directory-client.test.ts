import { describe, expect, it } from "vitest";
import type { Connection, ConnectionOptions } from "~/modules/connection/types.ts";
import type { CommandOutcome, DirectoryCommand, DirectoryEvent, WorkspaceRow } from "~/modules/protocol/types.ts";
import { createDirectoryClient } from "./service.ts";

const row = (id: string, createdAt: number, pinned = false): WorkspaceRow => ({
  id,
  name: id,
  pinned,
  createdAt,
  updatedAt: createdAt,
  createdBy: "Noor",
  chats: [],
  documents: [],
});

function setUp(outcome: CommandOutcome = { ok: true, output: { kind: "done" } }) {
  const sent: object[] = [];
  let options!: ConnectionOptions<DirectoryCommand, DirectoryEvent>;
  const connection: Connection<DirectoryCommand> = {
    send: async (command) => (sent.push(command), outcome),
    notify: () => {},
    close: () => {},
  };
  const client = createDirectoryClient({
    connect: (given) => ((options = given), connection),
    open: () => {
      throw new Error("not used");
    },
    onError: () => {},
  });
  return { client, sent, emit: (event: DirectoryEvent) => options.onEvent(event), options: () => options };
}
const snapshot = (workspaces: WorkspaceRow[]): DirectoryEvent => ({
  type: "directory.snapshot",
  protocol: 1,
  me: { id: "guest:1", name: "Noor" },
  models: [],
  workspaces,
  people: [],
  agents: [],
  isAdmin: true,
});

describe("the directory client", () => {
  it("keeps workspaces pinned first, then oldest first", () => {
    const { client, emit } = setUp();
    emit(snapshot([row("b", 2), row("a", 1)]));
    emit({ type: "workspace.changed", workspace: row("c", 3, true) });
    emit({ type: "workspace.changed", workspace: { ...row("a", 1), name: "renamed" } });
    expect(client.state.get().workspaces.map(({ name }) => name)).toEqual(["c", "renamed", "b"]);
    emit({ type: "workspace.removed", workspaceId: "b" });
    expect(client.state.get().workspaces).toHaveLength(2);
  });

  it("replaces everything on a new snapshot", () => {
    const { client, emit } = setUp();
    expect(client.state.get().loaded).toBe(false);
    emit(snapshot([row("a", 1)]));
    emit(snapshot([row("b", 1)]));
    expect(client.state.get()).toMatchObject({ loaded: true, me: { name: "Noor" }, workspaces: [{ id: "b" }] });
  });

  it("names a new workspace's id itself, so a replay cannot create two", async () => {
    const { client, sent } = setUp();
    const answer = await client.createWorkspace("Research");
    expect(answer.ok && sent[0]).toMatchObject({ type: "workspace.create", workspaceId: answer.ok && answer.value });
  });

  it("returns a new chat's id, and the server's refusals", async () => {
    const created = setUp({ ok: true, output: { kind: "chat", chatId: 7 } });
    expect(await created.client.createChat("a")).toEqual({ ok: true, value: 7 });
    const error = { code: "not_found", message: "Gone" } as const;
    expect(await setUp({ ok: false, error }).client.createChat("a")).toEqual({ ok: false, error });
  });
});
