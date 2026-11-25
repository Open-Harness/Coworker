import { runInDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { WorkspaceObject } from "~/main.ts";
import { fakeClock } from "~/modules/clock/testing.ts";
import { openVault } from "~/modules/vault/service.ts";
import { testMasterKey } from "~/modules/vault/testing.ts";
import type { CreateWorkspaceResult } from "~/modules/workspaces/types.ts";
import { bindings, json, signUp } from "../../test/flows.ts";

const SECRET = "sk-ant-api03-delete-me";

/** Every row in an object's storage, blobs as bytes in hex, so nothing hides. */
const dump = (sql: SqlStorage): string =>
  sql
    .exec<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'sqlite_%'")
    .toArray()
    .flatMap(({ name }) =>
      sql
        .exec(`SELECT * FROM "${name}"`)
        .toArray()
        .map((row) => `${name}:${JSON.stringify(row)}`),
    )
    .join("\n");

const count = async (table: string, column: string, id: string): Promise<number> =>
  (await bindings.AUTH.prepare(`SELECT COUNT(*) AS n FROM "${table}" WHERE "${column}" = ?`).bind(id).first<{ n: number }>())?.n ?? -1;

describe("workspace flows", () => {
  it("flw:workspace/delete", async () => {
    const ada = await signUp("ada.delete@example.test", "Ada");
    const created = await json<CreateWorkspaceResult>(
      await ada.send("POST", "/api/workspaces", { name: "Gone", address: "gone", region: "eu" }),
    );
    if (created._tag !== "Created") throw new Error(created._tag);
    const { workspaceId } = created.workspace;
    const row = await bindings.AUTH.prepare(`SELECT "objectId" FROM "workspace_directory" WHERE "workspaceId" = ?`)
      .bind(workspaceId)
      .first<{ objectId: string }>();
    const object = bindings.WORKSPACE.get(bindings.WORKSPACE.idFromString(row?.objectId ?? ""));
    expect(await object.storeSecret("anthropic", SECRET)).toEqual({ _tag: "Stored" });
    // Ciphertext that outlives the workspace: a copy in a backup, a log, anywhere.
    const leftover = await runInDurableObject(
      object,
      (_instance: WorkspaceObject, state) =>
        state.storage.sql.exec("SELECT sealed FROM vault_secret WHERE name = 'anthropic'").one()["sealed"],
    );

    expect(await json(await ada.send("DELETE", `/api/workspaces/${workspaceId}`))).toEqual({ _tag: "Removed" });

    for (const [table, column] of [
      ["organization", "id"],
      ["member", "organizationId"],
      ["invitation", "organizationId"],
      ["workspace_directory", "workspaceId"],
    ]) {
      expect(await count(table ?? "", column ?? "", workspaceId), table).toBe(0);
    }
    expect(await object.describe()).toEqual({ _tag: "NotProvisioned" });
    expect(await object.secrets()).toEqual([]);
    const left = await runInDurableObject(object, (_instance: WorkspaceObject, state) => dump(state.storage.sql));
    expect(left).not.toContain("vault_key");
    expect(left).not.toContain("Gone");
    // Put the old ciphertext back in a workspace made again in the same object: no data key left fits it.
    await object.provision({ workspaceId, name: "Again", address: "again", region: "eu", createdBy: "x", createdAt: 0 });
    await object.storeSecret("other", "a new key");
    const reopened = await runInDurableObject(object, async (_instance: WorkspaceObject, state) => {
      state.storage.sql.exec("INSERT INTO vault_secret (name, sealed, updated_at) VALUES ('anthropic', ?, 0)", leftover);
      const vault = openVault({
        sql: state.storage.sql,
        masterKeys: { current: testMasterKey(), retired: [] },
        clock: fakeClock(),
        audit: () => undefined,
      });
      return vault.use("anthropic", () => "opened");
    });
    expect(reopened).toEqual({ _tag: "Undecryptable", name: "anthropic" });
    expect(await json(await ada.send("GET", "/api/workspaces"))).toEqual({ workspaces: [] });
  });
});
