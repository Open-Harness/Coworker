import { describe, expect, it } from "vitest";
import { noAgent } from "./service.ts";

describe("agent", () => {
  it("says it is not built, as a value", async () => {
    expect(await noAgent.answer("chat", { key: "k", text: "Hello", by: "pat" }, { instructions: "", tools: [], model: "inherit" })).toEqual(
      {
        _tag: "NotBuilt",
        what: "agent.answer",
      },
    );
  });
  it.todo("a thread is a fork of its work's conversation at the playbook page; a checker's is a fresh conversation");
  it.todo("a tool that waits for a person parks on a signal, and a restart while parked runs no tool code");
  it.todo("every model call goes through pi-ai: an Anthropic connection is spoken to in Anthropic's own format");
  it.todo("a thread's end reaches the work once: reported, checked, or failed with why");
  it.todo("an evicted object wakes on its alarm and goes on from the last checkpoint");
});
