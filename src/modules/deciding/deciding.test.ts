import { describe, expect, it } from "vitest";
import { noAgent } from "~/modules/agent/service.ts";
import { createDeciding } from "./service.ts";
import type { DecidingDeps } from "./types.ts";

const clock = { now: () => 1_000 };

describe("deciding", () => {
  it("decides nothing, and says nothing is to come back for, when nothing came in", async () => {
    const deps: DecidingDeps = {
      store: { pending: () => [], managers: () => [], decided: () => undefined },
      manager: () => {
        throw new Error("no manager is asked");
      },
      ask: noAgent.ask,
      standing: async () => undefined,
      clock,
    };
    expect(await createDeciding(deps).run()).toEqual({ again: null });
  });

  it("leaves an item with nobody to hear it as left, once", async () => {
    const kept: string[] = [];
    const item = {
      id: "i1",
      trigger: "event",
      by: "event",
      account: "github",
      place: "a/b",
      thread: "github:a/b#1",
      event: "issue",
      actor: { address: "github:1", name: "x", bot: false },
      addressed: true,
      at: 1,
      title: "t",
      text: "t",
      same: "s",
    } as const;
    let pending = [{ item, hears: [] as readonly string[] }];
    const deps: DecidingDeps = {
      store: {
        pending: () => pending,
        managers: () => [],
        decided: (id, decision) => {
          kept.push(`${id}:${decision._tag}`);
          pending = [];
        },
      },
      manager: () => {
        throw new Error("no manager is asked");
      },
      ask: noAgent.ask,
      standing: async () => "write",
      clock,
    };
    await createDeciding(deps).run();
    expect(kept).toEqual(["i1:Left"]);
  });
});
