import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { Env } from "~/main.ts";
import { countingIds, fakeClock } from "~/modules/clock/testing.ts";
import { openVault } from "~/modules/vault/service.ts";
import { testMasterKey } from "~/modules/vault/testing.ts";
import { openModels } from "./service.ts";
import { FAKE_ENDPOINT, FAKE_KEYS } from "./testing.ts";
import type { ModelPick, Models } from "./types.ts";

const { WORKSPACE } = env as unknown as Env;

/** Models over a fresh Workspace object's storage; `defaultPick` is what the workspace's default model says. */
const withModels = <T>(defaultPick: () => ModelPick | undefined, fn: (models: Models) => Promise<T>): Promise<T> =>
  runInDurableObject(WORKSPACE.get(WORKSPACE.newUniqueId()), (_instance, state) => {
    const clock = fakeClock();
    const vault = openVault({
      sql: state.storage.sql,
      masterKeys: { current: testMasterKey(), retired: [] },
      clock,
      audit: () => undefined,
    });
    return fn(
      openModels({ sql: state.storage.sql, vault, clock, ids: countingIds(), fetch: (input, init) => fetch(input, init), defaultPick }),
    );
  });

describe("which model answers", () => {
  it("follows the choice made for the caller, then the workspace's default, then the first working connection", () => {
    let fallback: ModelPick | undefined;
    return withModels(
      () => fallback,
      async (models) => {
        const ours = await models.addEndpoint({ label: "Ours", baseUrl: FAKE_ENDPOINT, key: "endpoint-key" });
        await models.addKey({ source: "openai", key: FAKE_KEYS.openai });
        if (ours._tag !== "Added") throw new Error(ours._tag);
        const [first, second] = models.list();
        if (first === undefined || second === undefined) throw new Error("two connections expected");
        expect(models.route()).toEqual({
          _tag: "Route",
          connectionId: first.id,
          label: "Ours",
          source: "endpoint",
          api: "openai-completions",
        });

        fallback = { connectionId: first.id, model: "scripted-large" };
        expect(models.route()).toMatchObject({ connectionId: first.id, model: "scripted-large" });
        expect(models.route()).not.toHaveProperty("notice");

        const chosen = { connectionId: second.id, model: second.models[0] ?? "" };
        expect(models.route(chosen)).toMatchObject({ connectionId: second.id, model: chosen.model });
      },
    );
  });

  it("says so, and uses the next choice, when a chosen connection stopped working or no longer lists the model", () =>
    withModels(
      () => undefined,
      async (models) => {
        const ours = await models.addEndpoint({ label: "Ours", baseUrl: FAKE_ENDPOINT, key: "endpoint-key" });
        await models.addKey({ source: "openai", key: FAKE_KEYS.openai });
        if (ours._tag !== "Added") throw new Error(ours._tag);
        const { id } = ours.connection;

        const unlisted = models.route({ connectionId: id, model: "scripted-gone" });
        expect(unlisted).toMatchObject({ _tag: "Route", connectionId: id, model: "scripted-mini" });
        expect(unlisted._tag === "Route" && unlisted.notice).toBe(
          "The chosen model scripted-gone cannot be used (Ours no longer lists it). scripted-mini on Ours answered instead.",
        );

        await models.change(id, { key: "not-the-key" });
        const broken = models.route({ connectionId: id, model: "scripted-large" });
        expect(broken).toMatchObject({ _tag: "Route", source: "openai" });
        expect(broken._tag === "Route" && broken.notice).toContain("The chosen model scripted-large cannot be used (Ours is not working:");
        expect(models.route({ connectionId: "gone_1", model: "x" })).toMatchObject({
          notice: expect.stringContaining("its connection was removed"),
        });
      },
    ));
});
