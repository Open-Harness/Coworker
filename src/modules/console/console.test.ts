import { describe, expect, it } from "vitest";
import type { Did } from "~/modules/api/types.ts";
import type { ManagerStoreApi } from "~/modules/manager-store/types.ts";
import type { AuditRow, ConsoleDeps, ItemRow, ManagerRow, Store } from "./types.ts";
import { createConsole } from "./service.ts";

function memoryStore(): Store {
  const dids = new Map<string, Did>();
  const settings = new Map<string, unknown>();
  const lines: AuditRow[] = [];
  const managers: ManagerRow[] = [];
  const items: ItemRow[] = [];
  return {
    claim: async (key) => {
      const done = dids.get(key);
      return done === undefined ? { is: "yours" } : { is: "done", did: done };
    },
    settle: async (key, did) => void dids.set(key, did),
    audit: async (row) => void lines.unshift({ ...row, id: String(lines.length + 1) }),
    auditLines: async () => ({ lines, next: null }),
    setting: async (name) => settings.get(name),
    set: async (name, value) => void settings.set(name, value),
    managers: async () => managers,
    addManager: async (row) => void managers.push(row),
    asks: async () => [],
    items: async () => ({ rows: items, next: null }),
    setManager: async () => undefined,
    reopen: async () => undefined,
    note: async () => undefined,
    activity: async () => [],
    addChat: async () => undefined,
    chats: async () => [],
    changed: async () => undefined,
    keep: async () => undefined,
    kept: async () => [],
    messages: async () => [],
    addMessage: async () => undefined,
    mail: async () => ({ is: "refused", why: "no mailbox" }),
    mcp: async () => ({ is: "failed", why: "no servers" }),
  };
}

const nobody: ManagerStoreApi = {
  open: async () => ({ _tag: "AlreadyOpen" }),
  head: async () => undefined,
  versions: async () => [],
  version: async () => undefined,
  copy: async () => undefined,
  hearing: async () => undefined,
  take: async () => {
    throw new Error("not used");
  },
  heard: async () => undefined,
  answered: async () => undefined,
  event: async () => ({ _tag: "Gone" }),
  adopt: async () => ({ _tag: "NeverOpened" }),
  board: async () => [],
  news: async () => undefined,
  work: async () => undefined,
  asks: async () => [],
  usage: async () => [],
  tick: async () => undefined,
  destroy: async () => undefined,
  keep: async () => undefined,
  kept: async () => [],
  save: async () => {
    throw new Error("not used");
  },
};

function deps(role: "Owner" | "Member" = "Owner"): ConsoleDeps {
  const me = { id: "email:ama@example.test", email: "ama@example.test", name: "Ama", role } as const;
  return {
    workspace: { id: "ws1", name: "Acme", address: "acme", region: "eu", since: 1 },
    who: me,
    people: [me],
    store: memoryStore(),
    asks: async () => ({ op: "inbox", items: [] }),
    outside: {
      connections: async () => [],
      secrets: async () => [
        { name: "model:x", updatedAt: 1 },
        { name: "deploy", updatedAt: 2 },
      ],
      github: async () => ({ sources: [] }),
      lost: async () => undefined,
      billing: async () => null,
      rename: async () => ({ _tag: "Renamed" }),
      retire: async () => ({ _tag: "Scheduled" }),
      people: { role: async () => ({ _tag: "Done" }), remove: async () => ({ _tag: "Done" }) },
      read: async () => ({ _tag: "Gone" }),
      call: async () => new Response("no model", { status: 503 }),
    },
    managers: { mint: () => ({ objectId: "o", store: nobody }), get: () => nobody },
    ours: [],
    app: null,
    mailbox: "acme@co-worker.test",
    clock: { now: () => 1_000 },
    ids: { next: (prefix) => `${prefix}_1` },
  };
}
const call = (path: string, body?: unknown) => ({ path, query: new URLSearchParams(), ...(body === undefined ? {} : { body }) });

describe("console", () => {
  it("answers the shell with who and where, and 404 in words for what is not there", async () => {
    const desk = createConsole(deps());
    const shell = await desk.read(call("/shell"));
    expect(shell).toMatchObject({
      _tag: "Ok",
      value: { workspace: { name: "Acme" }, me: { name: "Ama", role: "Owner" }, tree: [], inbox: 0 },
    });
    expect(await desk.read(call("/nowhere"))).toMatchObject({ _tag: "Problem", status: 404 });
    expect(await desk.read(call("/m/nobody/board"))).toMatchObject({
      _tag: "Problem",
      status: 404,
      says: expect.stringMatching(/nobody/u),
    });
  });

  it("shows no vault name that is a connection's key", async () => {
    const keys = await createConsole(deps()).read(call("/settings/keys"));
    expect(keys._tag === "Ok" && keys.value).toMatchObject({ secrets: [{ name: "deploy" }] });
  });

  it("does a doing once per key, and every doing is a line of the audit log", async () => {
    const desk = createConsole(deps());
    const first = await desk.write(call("/do", { doing: "workspace.general", values: { perDay: 7 }, key: "k" }));
    expect(first).toMatchObject({ _tag: "Ok", value: { _tag: "Done" } });
    expect(await desk.write(call("/do", { doing: "workspace.general", values: { perDay: 9 }, key: "k" }))).toEqual(first);
    expect(await desk.read(call("/settings/general"))).toMatchObject({ value: { perDay: 7 } });
    await desk.write(call("/do", { doing: "no.such", values: {}, key: "k2" }));
    const log = await desk.read(call("/settings/audit-log"));
    expect(log._tag === "Ok" && (log.value as { lines: { outcome: string; by: string }[] }).lines.map((one) => one.outcome)).toEqual([
      "refused",
      "done",
    ]);
  });

  it("refuses in words what is unknown, what is missing, and what a role may not", async () => {
    const desk = createConsole(deps());
    const answer = async (doing: string, values: object, key: string) =>
      (await desk.write(call("/do", { doing, values, key }))) as { value: Did };
    expect((await answer("no.such", {}, "a")).value).toMatchObject({ _tag: "Refused", why: expect.stringMatching(/no\.such/u) });
    expect((await answer("template.save", { name: "x" }, "b")).value).toMatchObject({ _tag: "Refused" });
    const member = createConsole(deps("Member"));
    const refused = (await member.write(call("/do", { doing: "workspace.general", values: { perDay: 1 }, key: "c" }))) as { value: Did };
    expect(refused.value).toMatchObject({ _tag: "Refused" });
  });

  it("makes nothing from a template that is not there", async () => {
    const desk = createConsole({ ...deps(), ours: [] });
    const made = (await desk.write(call("/do", { doing: "manager.make", values: { template: "repo", answers: {} }, key: "m" }))) as {
      value: Did;
    };
    expect(made.value).toMatchObject({ _tag: "Refused", why: expect.stringMatching(/repo/u) });
    expect(await desk.read(call("/tree"))).toMatchObject({ value: { rows: [] } });
  });
});
