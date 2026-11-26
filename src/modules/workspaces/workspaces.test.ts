import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { createAuth } from "~/modules/auth/service.ts";
import { fakeClock } from "~/modules/clock/testing.ts";
import { fakeMailer } from "~/modules/mail/testing.ts";
import { createWorkspaces, durableTenantObjects } from "./service.ts";
import { faultyObjects, localJurisdictions, objectFaults, type PlainNamespace } from "./testing.ts";

const { AUTH, WORKSPACE } = env as unknown as { AUTH: D1Database; WORKSPACE: PlainNamespace };

const auth = createAuth({
  now: Date.now,
  database: AUTH,
  mailer: fakeMailer(),
  settings: { baseUrl: "http://app.test", secret: "test-secret-that-is-at-least-32-characters-long", sendFrom: "hello@app.test" },
});

async function person(email: string): Promise<string> {
  const id = crypto.randomUUID();
  await AUTH.prepare(`INSERT INTO "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt") VALUES (?, ?, ?, 1, 0, 0)`)
    .bind(id, email, email)
    .run();
  return id;
}

function world() {
  const faults = objectFaults();
  const workspaces = createWorkspaces({
    database: AUTH,
    auth,
    objects: faultyObjects(durableTenantObjects(localJurisdictions(WORKSPACE)), faults),
    clock: fakeClock(),
  });
  return { workspaces, faults };
}

describe("workspaces", () => {
  it("acc:workspace/address", async () => {
    const { workspaces } = world();
    const ada = await person("ada@example.test");
    const first = await workspaces.create({ userId: ada, name: "Acme", address: "Acme", region: "eu" });
    expect(first).toMatchObject({ _tag: "Created", workspace: { address: "acme", region: "eu", role: "owner" } });
    const grace = await person("grace@example.test");
    expect(await workspaces.create({ userId: grace, name: "Also Acme", address: "acme", region: "us" })).toEqual({ _tag: "AddressTaken" });
    expect(await workspaces.create({ userId: grace, name: "Bad", address: "no spaces", region: "us" })).toMatchObject({
      _tag: "InvalidAddress",
    });
    expect(await workspaces.create({ userId: grace, name: "Reserved", address: "www", region: "us" })).toMatchObject({
      _tag: "InvalidAddress",
    });
    expect((await workspaces.list(grace)).map((entry) => entry.address)).toEqual([]);
  });

  it("lists, opens and removes a workspace for its members only", async () => {
    const { workspaces } = world();
    const ada = await person("ada2@example.test");
    const outsider = await person("eve@example.test");
    const created = await workspaces.create({ userId: ada, name: "Lab", address: "lab", region: "us" });
    if (created._tag !== "Created") throw new Error(created._tag);
    const { workspaceId } = created.workspace;
    expect(await workspaces.list(ada)).toEqual([created.workspace]);
    expect(await workspaces.open(ada, workspaceId)).toMatchObject({
      _tag: "Opened",
      role: "owner",
      profile: { name: "Lab", region: "us" },
    });
    expect(await workspaces.open(outsider, workspaceId)).toEqual({ _tag: "NotMember" });
    expect(await workspaces.remove(outsider, workspaceId)).toEqual({ _tag: "NotMember" });
    expect(await workspaces.remove(ada, workspaceId)).toEqual({ _tag: "Removed" });
    expect(await workspaces.list(ada)).toEqual([]);
  });

  it("leaves no organization behind when the object fails", async () => {
    const { workspaces, faults } = world();
    const ada = await person("ada3@example.test");
    faults.failNextProvision();
    expect(await workspaces.create({ userId: ada, name: "Broken", address: "broken", region: "eu" })).toMatchObject({ _tag: "Failed" });
    expect(await AUTH.prepare(`SELECT 1 FROM "organization" WHERE "slug" = 'broken'`).first()).toBeNull();
    expect(await workspaces.create({ userId: ada, name: "Fixed", address: "broken", region: "eu" })).toMatchObject({ _tag: "Created" });
  });
});
