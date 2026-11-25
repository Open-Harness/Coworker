import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { Env } from "~/main.ts";
import { countingIds, fakeClock } from "~/modules/clock/testing.ts";
import { openVault } from "~/modules/vault/service.ts";
import { testMasterKey } from "~/modules/vault/testing.ts";
import { openModels } from "./service.ts";
import { FAKE_ENDPOINT, FAKE_KEYS } from "./testing.ts";
import type { Models } from "./types.ts";

const { WORKSPACE } = env as unknown as Env;

/** Runs `fn` with models over a fresh Workspace object's storage, reaching the fake providers. */
const withModels = <T>(fn: (models: Models) => Promise<T>): Promise<T> =>
  runInDurableObject(WORKSPACE.get(WORKSPACE.newUniqueId()), (_instance, state) => {
    const { sql } = state.storage;
    const clock = fakeClock();
    const vault = openVault({ sql, masterKeys: { current: testMasterKey(), retired: [] }, clock, audit: () => undefined });
    return fn(openModels({ sql, vault, clock, ids: countingIds(), fetch: (input, init) => fetch(input, init) }));
  });

describe("models", () => {
  it("acc:models/none", () =>
    withModels(async (models) => {
      expect(models.readiness()).toEqual({ _tag: "NoModel", reason: expect.stringContaining("No model is connected") });
      await models.addKey({ source: "anthropic", key: "sk-ant-wrong" });
      const failing = models.readiness();
      expect(failing).toMatchObject({ _tag: "NoModel" });
      expect(failing._tag === "NoModel" && failing.reason).toContain("Anthropic: invalid x-api-key");
      await models.addKey({ source: "openai", key: FAKE_KEYS.openai });
      expect(models.readiness()).toMatchObject({ _tag: "Ready", connection: { source: "openai" } });
    }));

  it("takes a Google and an OpenCode key, and says which is which when one fails", () =>
    withModels(async (models) => {
      for (const source of ["google", "opencode"] as const) {
        expect(await models.addKey({ source, key: FAKE_KEYS[source] })).toMatchObject({ connection: { source, check: { _tag: "Works" } } });
        expect(await models.addKey({ source, key: "wrong" })).toMatchObject({ connection: { source, check: { _tag: "Failed" } } });
      }
      expect(models.readiness()).toMatchObject({ _tag: "Ready", connection: { source: "google" } });
    }));

  it("refuses an empty key and an endpoint that is not https", () =>
    withModels(async (models) => {
      expect(await models.addKey({ source: "anthropic", key: "  " })).toMatchObject({ _tag: "Invalid" });
      expect(await models.addEndpoint({ label: "x", baseUrl: "http://models.example.test/v1" })).toMatchObject({ _tag: "Invalid" });
      expect(models.list()).toEqual([]);
    }));

  it("rechecks and removes a connection, and its key with it", () =>
    withModels(async (models) => {
      const added = await models.addEndpoint({ label: "Ours", baseUrl: `${FAKE_ENDPOINT}/`, key: "endpoint-key" });
      if (added._tag !== "Added") throw new Error(added._tag);
      expect(added.connection).toMatchObject({ baseUrl: FAKE_ENDPOINT, check: { _tag: "Works" } });
      expect(await models.recheck(added.connection.id)).toMatchObject({ check: { _tag: "Works" } });
      expect(models.remove(added.connection.id)).toBe(true);
      expect(await models.recheck(added.connection.id)).toBeUndefined();
    }));
});
