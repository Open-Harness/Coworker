import { runInDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { WorkspaceObject } from "~/main.ts";
import type { ModelConnection, Readiness } from "~/modules/models/types.ts";
import { FAKE_ENDPOINT, FAKE_ENDPOINT_MODELS, FAKE_KEYS } from "~/modules/models/testing.ts";
import type { CreateWorkspaceResult } from "~/modules/workspaces/types.ts";
import { bindings, json, signUp, type Browser } from "../../test/flows.ts";

interface Added {
  readonly _tag: string;
  readonly connection: ModelConnection;
}

async function workspace(email: string, address: string): Promise<{ owner: Browser; path: string; objectId: string }> {
  const owner = await signUp(email, "Owner");
  const created = await json<CreateWorkspaceResult>(await owner.send("POST", "/api/workspaces", { name: address, address, region: "us" }));
  if (created._tag !== "Created") throw new Error(created._tag);
  const row = await bindings.AUTH.prepare(`SELECT "objectId" FROM "workspace_directory" WHERE "workspaceId" = ?`)
    .bind(created.workspace.workspaceId)
    .first<{ objectId: string }>();
  return { owner, path: `/api/workspaces/${created.workspace.workspaceId}/models`, objectId: row?.objectId ?? "" };
}

/** Every row in the object, blobs as text, to show a key is nowhere in the clear. */
const storedText = (objectId: string): Promise<string> =>
  runInDurableObject(bindings.WORKSPACE.get(bindings.WORKSPACE.idFromString(objectId)), (_instance: WorkspaceObject, state) => {
    const { sql } = state.storage;
    const tables = sql.exec<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '_cf_%'").toArray();
    const text = (value: SqlStorageValue): string => (value instanceof ArrayBuffer ? new TextDecoder().decode(value) : String(value));
    return tables
      .flatMap(({ name }) =>
        sql
          .exec(`SELECT * FROM "${name}"`)
          .toArray()
          .flatMap((row) => Object.values(row).map(text)),
      )
      .join("\n");
  });

describe("model flows", () => {
  it("flw:models/test-key", async () => {
    const { owner, path, objectId } = await workspace("keys@example.test", "keys");
    const wrong = await json<Added>(await owner.send("POST", path, { source: "anthropic", key: "sk-ant-wrong" }));
    expect(wrong.connection.check).toEqual({ _tag: "Failed", checkedAt: expect.any(Number), error: "invalid x-api-key" });
    const right = await json<Added>(await owner.send("POST", path, { source: "anthropic", key: FAKE_KEYS.anthropic }));
    expect(right.connection).toMatchObject({
      source: "anthropic",
      label: "Anthropic",
      check: { _tag: "Works", checkedAt: expect.any(Number) },
    });
    const screen = await json<{ connections: ModelConnection[]; readiness: Readiness }>(await owner.send("GET", path));
    expect(screen.connections.map((connection) => connection.check._tag)).toEqual(["Failed", "Works"]);
    expect(screen.readiness).toMatchObject({ _tag: "Ready" });
    expect(JSON.stringify(screen)).not.toContain(FAKE_KEYS.anthropic);
    expect(await storedText(objectId)).not.toContain(FAKE_KEYS.anthropic);
  });

  it("flw:models/endpoint", async () => {
    const { owner, path } = await workspace("endpoint@example.test", "endpoint-co");
    const added = await json<Added>(
      await owner.send("POST", path, { source: "endpoint", label: "Our models", baseUrl: FAKE_ENDPOINT, key: "endpoint-key" }),
    );
    expect(added.connection).toMatchObject({
      source: "endpoint",
      label: "Our models",
      models: [...FAKE_ENDPOINT_MODELS],
      check: { _tag: "Works" },
    });
    const refused = await json<Added>(
      await owner.send("POST", path, { source: "endpoint", label: "Wrong key", baseUrl: FAKE_ENDPOINT, key: "nope" }),
    );
    expect(refused.connection.check).toMatchObject({ _tag: "Failed", error: "Incorrect API key provided." });
    const member = await signUp("not-owner@example.test", "Someone");
    expect((await member.send("GET", path)).status).toBe(404);
  });
});
