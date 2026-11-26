import { describe, expect, it } from "vitest";
import { checkAgentConfig, readAgentConfig, sameAgentConfig } from "./service.ts";
import { BLANK_AGENT } from "./types.ts";

const whole = {
  name: "Docs writer",
  instructions: "Write docs.",
  model: { connectionId: "c1", model: "m1" },
  thinking: "high",
  tools: ["bash", "edit"],
  skills: ["release-notes"],
  environment: "env_1",
} as const;

describe("a config someone sent", () => {
  it("is taken whole, with its name trimmed and what was left out blank", () => {
    expect(checkAgentConfig({ ...whole, name: "  Docs writer " })).toEqual({ ok: true, value: whole });
    expect(checkAgentConfig({ name: "Docs writer" })).toEqual({ ok: true, value: { ...BLANK_AGENT, name: "Docs writer" } });
  });

  it.each([
    [{ name: " " }, "name must be a name of up to 60 characters"],
    [{ name: "x".repeat(61) }, "name must be a name of up to 60 characters"],
    [{ name: "two\nlines" }, "name must be a name of up to 60 characters"],
    [{ instructions: "x".repeat(20_001) }, "instructions must be words, at most 20000 characters"],
    [{ thinking: "extreme" }, "thinking must be one of off, low, medium, high"],
    [{ tools: ["rm"] }, "tools must be of bash, read, edit, web_fetch"],
    [{ tools: "bash" }, "tools must be of bash, read, edit, web_fetch"],
    [{ skills: [1] }, "skills must be names of the workspace's skills"],
    [{ model: { connectionId: "c1" } }, "model must be a connection and its model, or none for the workspace's"],
    [{ environment: 3 }, "environment must be an environment's id, or none for the plain container"],
    [{ colour: "red" }, expect.stringContaining("colour is not a setting of an agent")],
  ])("is refused in words: %j", (wrong, reason) => {
    expect(checkAgentConfig({ ...whole, ...wrong })).toEqual({ ok: false, reason });
  });

  it("is refused when it is not an object", () => {
    for (const sent of [undefined, null, "config", []]) expect(checkAgentConfig(sent).ok).toBe(false);
  });
});

describe("a config saved before", () => {
  it("opens, with what cannot be read any more left blank", () => {
    expect(readAgentConfig(whole)).toEqual(whole);
    const { environment: _later, ...older } = whole;
    expect(readAgentConfig({ ...older, tools: ["bash", "dropped"], thinking: "extreme", gone: 1 })).toEqual({
      ...whole,
      tools: ["bash"],
      thinking: "medium",
      environment: null,
    });
    expect(readAgentConfig("nothing")).toEqual(BLANK_AGENT);
  });

  it("is the same agent whatever order it was written in, and another one when any setting differs", () => {
    const { model, ...rest } = whole;
    expect(sameAgentConfig(whole, { model: { model: model.model, connectionId: model.connectionId }, ...rest })).toBe(true);
    for (const change of [{ environment: null }, { tools: ["bash"] as const }, { model: { connectionId: "c1", model: "m2" } }])
      expect(sameAgentConfig(whole, { ...whole, ...change })).toBe(false);
  });
});
