import { runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { WorkspaceObject } from "~/main.ts";
import { fakeClock } from "~/modules/clock/testing.ts";
import { FAKE_CHATGPT_CODE } from "~/modules/models/testing.ts";
import type { ModelConnection } from "~/modules/models/types.ts";
import { openVault } from "~/modules/vault/service.ts";
import { testMasterKey } from "~/modules/vault/testing.ts";
import type { CreateWorkspaceResult } from "~/modules/workspaces/types.ts";
import { bindings, json, signUp } from "../../test/flows.ts";

interface Screen {
  readonly connections: readonly ModelConnection[];
}

/** The access token the vault now holds for a connection, read the way the object reads it. */
const storedAccess = (object: DurableObjectStub<WorkspaceObject>, id: string): Promise<unknown> =>
  runInDurableObject(object, async (_instance: WorkspaceObject, state) => {
    const vault = openVault({
      sql: state.storage.sql,
      masterKeys: { current: testMasterKey(), retired: [] },
      clock: fakeClock(),
      audit: () => undefined,
    });
    const used = await vault.use(`model:${id}`, (value) => (JSON.parse(value) as { access: string }).access);
    return used._tag === "Used" ? used.value : used._tag;
  });

describe("model flows", () => {
  it("flw:models/chatgpt", async () => {
    const owner = await signUp("chatgpt@example.test", "Owner");
    const created = await json<CreateWorkspaceResult>(
      await owner.send("POST", "/api/workspaces", { name: "GPT", address: "gpt-co", region: "eu" }),
    );
    if (created._tag !== "Created") throw new Error(created._tag);
    const path = `/api/workspaces/${created.workspace.workspaceId}/models`;

    const started = await json<{ _tag: string; authorizeUrl: string }>(await owner.send("POST", path, { source: "chatgpt" }));
    const authorize = new URL(started.authorizeUrl);
    expect(authorize.host).toBe("auth.openai.com");
    expect(authorize.searchParams.get("code_challenge_method")).toBe("S256");
    const state = authorize.searchParams.get("state") ?? "";
    const redirect = new URL(authorize.searchParams.get("redirect_uri") ?? "");
    redirect.search = new URLSearchParams({ code: FAKE_CHATGPT_CODE, state, client_id: "issued-client" }).toString();

    const wrongState = new URL(redirect);
    wrongState.searchParams.set("state", "forged");
    expect(await json(await owner.send("POST", `${path}/chatgpt`, { redirectUrl: wrongState.toString() }))).toMatchObject({
      _tag: "Invalid",
    });

    const added = await json<{ _tag: string; connection: ModelConnection }>(
      await owner.send("POST", `${path}/chatgpt`, { redirectUrl: redirect.toString() }),
    );
    expect(added.connection).toMatchObject({ source: "chatgpt", check: { _tag: "Works" } });
    const firstExpiry = added.connection.expiresAt ?? 0;
    // The same redirect cannot be used twice.
    expect(await json(await owner.send("POST", `${path}/chatgpt`, { redirectUrl: redirect.toString() }))).toMatchObject({
      _tag: "Invalid",
    });

    const row = await bindings.AUTH.prepare(`SELECT "objectId" FROM "workspace_directory" WHERE "workspaceId" = ?`)
      .bind(created.workspace.workspaceId)
      .first<{ objectId: string }>();
    const object = bindings.WORKSPACE.get(bindings.WORKSPACE.idFromString(row?.objectId ?? ""));
    expect((await object.secrets()).map((secret) => secret.name)).toEqual([`model:${added.connection.id}`]);
    expect(await storedAccess(object, added.connection.id)).toBe("chatgpt-access-1");
    const alarm = await runInDurableObject(object, (_instance: WorkspaceObject, state) => state.storage.getAlarm());
    expect(alarm).not.toBeNull();
    expect(alarm ?? Infinity).toBeLessThan(firstExpiry);

    expect(await runDurableObjectAlarm(object)).toBe(true);
    expect(await storedAccess(object, added.connection.id)).toBe("chatgpt-access-2");
    const screen = await json<Screen>(await owner.send("GET", path));
    const refreshed = screen.connections[0];
    expect(refreshed?.check._tag).toBe("Works");
    expect(refreshed?.expiresAt ?? 0).toBeGreaterThan(firstExpiry);
    expect(JSON.stringify(screen)).not.toContain("chatgpt-access");
    const next = await runInDurableObject(object, (_instance: WorkspaceObject, state) => state.storage.getAlarm());
    expect(next ?? Infinity).toBeLessThan(refreshed?.expiresAt ?? 0);
  });
});
