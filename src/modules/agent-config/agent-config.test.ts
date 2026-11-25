import { describe, expect, it } from "vitest";
import { BLANK_AGENT, checkAgentConfig, TOOL_GROUPS } from "./service.ts";

describe("an agent config", () => {
  it("accepts a blank agent and one with every field", () => {
    expect(checkAgentConfig(BLANK_AGENT)).toEqual({ ok: true, value: BLANK_AGENT });
    const full = { ...BLANK_AGENT, model: { provider: "vibeproxy", modelId: "gpt-6-luna" }, thinkingLevel: "high", tools: ["web"] };
    expect(checkAgentConfig(full)).toEqual({ ok: true, value: full });
  });

  it.each([
    ["nothing", undefined],
    ["an empty name", { ...BLANK_AGENT, name: "  " }],
    ["an unknown tool", { ...BLANK_AGENT, tools: ["shell"] }],
    ["an unknown field", { ...BLANK_AGENT, secret: "x" }],
    ["no turns", { ...BLANK_AGENT, maxTurns: 0 }],
    ["a prompt without end", { ...BLANK_AGENT, system: "x".repeat(20_001) }],
  ])("refuses %s and says why", (_name, value) => {
    const checked = checkAgentConfig(value);
    expect(checked.ok).toBe(false);
    expect(checked.ok ? "" : checked.message).not.toBe("");
  });

  it("offers every group of tools", () => {
    expect(BLANK_AGENT.tools).toEqual(TOOL_GROUPS.map(({ group }) => group));
  });
});
