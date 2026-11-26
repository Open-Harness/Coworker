import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Env } from "~/main.ts";
import { fakeClock } from "~/modules/clock/testing.ts";
import { openVault } from "./service.ts";
import { testMasterKey } from "./testing.ts";
import type { MasterKeys, VaultAuditLine } from "./types.ts";

const { WORKSPACE } = env as unknown as Env;
const SECRET = "sk-ant-api03-very-secret-value";

/** Runs `fn` with a fresh Workspace object's storage. */
const inObject = <T>(fn: (sql: SqlStorage) => Promise<T>): Promise<T> =>
  runInDurableObject(WORKSPACE.get(WORKSPACE.newUniqueId()), (_instance, state) => fn(state.storage.sql));

const vaultIn = (sql: SqlStorage, masterKeys: MasterKeys = { current: testMasterKey(), retired: [] }, audit: VaultAuditLine[] = []) =>
  openVault({ sql, masterKeys, clock: fakeClock(), audit: (line) => void audit.push(line) });

/** Every value in every table, with blobs read as text too. */
function everything(sql: SqlStorage): string {
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
}

afterEach(() => void vi.restoreAllMocks());

describe("vault", () => {
  it("acc:vault/at-rest", () =>
    inObject(async (sql) => {
      const master = testMasterKey();
      await vaultIn(sql, { current: master, retired: [] }).put("anthropic", SECRET);
      expect(everything(sql)).not.toContain(SECRET);
      expect(everything(sql)).not.toContain(btoa(SECRET));
      // The row is AES-GCM under the data key, and the data key is stored only wrapped by the master key.
      const key = sql.exec("SELECT wrapped, master_key_id FROM vault_key").one();
      expect(key["master_key_id"]).toBe(master.id);
      const dataKey = await master.unwrap(new Uint8Array(key["wrapped"] as ArrayBuffer));
      const sealed = new Uint8Array(sql.exec("SELECT sealed FROM vault_secret WHERE name = 'anthropic'").one()["sealed"] as ArrayBuffer);
      const opened = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: sealed.slice(0, 12), additionalData: new TextEncoder().encode("co-worker/secret/anthropic") },
        await crypto.subtle.importKey("raw", dataKey ?? new Uint8Array(32), "AES-GCM", false, ["decrypt"]),
        sealed.slice(12),
      );
      expect(new TextDecoder().decode(opened)).toBe(SECRET);
      expect(await testMasterKey("other", 9).unwrap(new Uint8Array(key["wrapped"] as ArrayBuffer))).toBeUndefined();
    }));

  it("acc:vault/use-once", () =>
    inObject(async (sql) => {
      const printed: unknown[] = [];
      for (const level of ["log", "info", "warn", "error", "debug"] as const) {
        vi.spyOn(console, level).mockImplementation((...args: unknown[]) => void printed.push(...args));
      }
      const audit: VaultAuditLine[] = [];
      const vault = vaultIn(sql, undefined, audit);
      await vault.put("anthropic", SECRET);
      const seen: string[] = [];
      expect(await vault.use("anthropic", (value) => (seen.push(value), "called"))).toEqual({ _tag: "Used", value: "called" });
      expect(seen).toEqual([SECRET]);
      expect(await vault.use("missing", () => "never")).toEqual({ _tag: "NoSuchSecret", name: "missing" });
      expect(audit.map((line) => `${line.action} ${line.name}`)).toEqual(["put anthropic", "use anthropic"]);
      const outside = JSON.stringify({ audit, printed, list: vault.list(), vault, rewrap: await vault.rewrap() });
      expect(outside).not.toContain(SECRET);
      expect(vault.list()).toEqual([{ name: "anthropic", updatedAt: expect.any(Number) }]);
    }));

  it("acc:vault/rewrap", () =>
    inObject(async (sql) => {
      const old = testMasterKey("2026-11", 1);
      const next = testMasterKey("2026-12", 2);
      const before = vaultIn(sql, { current: old, retired: [] });
      await before.put("anthropic", SECRET);
      await before.put("github", "ghs_token");
      const sealedBefore = sql.exec("SELECT name, sealed FROM vault_secret ORDER BY name").toArray();
      expect(await vaultIn(sql, { current: next, retired: [old] }).rewrap()).toEqual({ _tag: "Rewrapped", to: "2026-12" });
      expect(sql.exec("SELECT name, sealed FROM vault_secret ORDER BY name").toArray()).toEqual(sealedBefore);
      const after = vaultIn(sql, { current: next, retired: [] });
      expect(await after.use("anthropic", (value) => value === SECRET)).toEqual({ _tag: "Used", value: true });
      expect(await after.use("github", (value) => value === "ghs_token")).toEqual({ _tag: "Used", value: true });
      expect(await after.rewrap()).toEqual({ _tag: "AlreadyCurrent" });
      expect(await vaultIn(sql, { current: old, retired: [] }).use("anthropic", () => true)).toEqual({
        _tag: "Undecryptable",
        name: "anthropic",
      });
    }));
});
