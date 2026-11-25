import { Harness, MemoryStorage } from "@earendil-works/pi-durable";
import { describe, expect, it } from "vitest";
import { context } from "../../../test/engine.ts";
import { createAgent } from "./service.ts";
import type { AgentConfig } from "./types.ts";
import { chats } from "~/modules/chats/service.ts";

const base: AgentConfig = { fakeModel: false, fetch: async () => new Response() };
const proxy = { url: "http://127.0.0.1:8317", models: ["gpt-6-luna"] };
const names = (config: Partial<AgentConfig>) =>
  createAgent({ ...base, ...config }).models.map(({ provider, modelId }) => `${provider}/${modelId}`);

describe("the models people can choose", () => {
  it("are those someone gave a key or a proxy for", () => {
    expect(names({})).toEqual([]);
    expect(createAgent(base).defaultModel).toBeUndefined();
    expect(names({ fakeModel: true })).toEqual(["fake/scripted", "fake/scripted-thinker"]);
    expect(names({ proxy })).toEqual(["vibeproxy/gpt-6-luna"]);
    expect(names({ anthropicKey: "k" }).every((name) => name.startsWith("anthropic/"))).toBe(true);
  });

  it("start with the default: the one asked for, else Luna through the proxy", () => {
    expect(names({ proxy, anthropicKey: "k", fakeModel: true })[0]).toBe("vibeproxy/gpt-6-luna");
    expect(names({ proxy, fakeModel: true, defaultModel: "fake/scripted" })[0]).toBe("fake/scripted");
    expect(names({ proxy, fakeModel: true, defaultModel: "gone/model" })[0]).toBe("vibeproxy/gpt-6-luna");
  });
});

describe("a workspace's settings", () => {
  const open = async () => {
    const agent = createAgent({ ...base, fakeModel: true, proxy, defaultModel: "fake/scripted" });
    const harness = await Harness.open(new MemoryStorage(), agent.harnessOptions, context);
    return { agent, harness };
  };
  const fake = { provider: "fake", modelId: "scripted" };

  it("have defaults, keep changes, and drop a budget on request", async () => {
    const { agent, harness } = await open();
    expect(await agent.settings(harness, context)).toEqual({ model: fake, thinkingLevel: "off", instructions: "", maxTurns: 50 });
    await agent.updateSettings(harness, { instructions: "Be kind", budgetUsd: 2 }, context);
    await agent.updateSettings(harness, { maxTurns: 9 }, context);
    expect(await agent.settings(harness, context)).toMatchObject({ instructions: "Be kind", budgetUsd: 2, maxTurns: 9 });
    await agent.updateSettings(harness, { budgetUsd: null }, context);
    expect(await agent.settings(harness, context)).not.toHaveProperty("budgetUsd");
    await harness.close(context);
  });

  it("are what a new chat starts with", async () => {
    const { agent, harness } = await open();
    await agent.updateSettings(harness, { thinkingLevel: "low" }, context);
    const by = { id: "guest:1", name: "Amina" };
    const created = await harness.commit((tx) => chats.create(tx, { requestId: "a", by, now: 1 }), context);
    if (!created.ok) throw new Error(created.message);
    const conversation = await harness.conversation(created.value, context);
    const submission = await conversation!.submit({ type: "input", content: "Hello", whenBusy: "followUp" }, context);
    expect(await submission.wait(context)).toMatchObject({ status: "done" });
    const usage = await agent.usage(harness, context);
    expect(usage.models.map(({ model }) => model)).toEqual(["fake/scripted"]);
    expect(usage.models[0]?.tokens).toBeGreaterThan(0);
    await harness.close(context);
  });
});
