import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { createModels } from "@earendil-works/pi-ai/models";
import { createRegistry, Harness, MemoryStorage, type ToolRegistration } from "@earendil-works/pi-durable";
import { obj } from "@earendil-works/pi-schema";
import { describe, expect, it } from "vitest";
import { BLANK_AGENT, type RunAgent } from "~/modules/agents/types.ts";
import { mount } from "./service.ts";
import type { AgentKind } from "./types.ts";

const tool = (name: string): ToolRegistration => ({
  name,
  description: name,
  parameters: obj({}),
  replay: "safe",
  execute: async () => ({ output: [] }),
});

/** A kind like the worker, whose `say` names what it was mounted with. */
const worker: AgentKind<{ readonly say: string }> = {
  name: "work",
  tools: ({ say }) => [tool(say)],
  chosen: () => ({ read: tool("read_file"), bash: tool("run_command") }),
  skills: () => tool("open_skill"),
};
const SKILL = { id: "s1", name: "notes", version: 2, description: "How we write", files: ["SKILL.md", "a.md"] };
const agent = (change: Partial<RunAgent> = {}): RunAgent => ({ ...BLANK_AGENT, name: "Docs writer", version: 1, skills: [], ...change });

/** What a conversation of the kind is once it has been configured, as the engine resolves it. */
async function configured<Deps>(kind: AgentKind<Deps>, deps: Deps, as: RunAgent | undefined) {
  const mounted = mount(kind, deps, {
    modelFor: (choice) => ({ provider: choice?.connectionId ?? "workspace", modelId: choice?.model ?? "default" }),
  });
  const registry = createRegistry();
  registry.install(mounted.extension);
  const models = createModels({ authContext: { env: async () => undefined, fileExists: async () => false } });
  const harness = await Harness.open(new MemoryStorage(), { models, registry, settings: { extensions: [] } }, BACKGROUND_CONTEXT);
  const id = await harness.commit(async (tx) => {
    const made = await tx.createConversation({ ownership: { kind: "ownerless" } });
    await mounted.configure(tx, made.id, as);
    return made.id;
  }, BACKGROUND_CONTEXT);
  const found = await (await harness.conversation(id, BACKGROUND_CONTEXT))?.agent(BACKGROUND_CONTEXT);
  await harness.close(BACKGROUND_CONTEXT);
  if (found === undefined) throw new Error("No conversation");
  return { ...found, tools: found.tools.map(({ name }) => name), extensions: found.extensions.map(({ name }) => name) };
}

describe("a conversation of a kind", () => {
  it("has, with no saved agent, every chosen tool, the workspace's model and nothing of its own to say", async () => {
    const made = await configured(worker, { say: "report" }, undefined);
    expect(made).toMatchObject({ extensions: ["work"], model: { provider: "workspace", modelId: "default" } });
    expect(made.tools).toEqual(["report", "read_file", "run_command"]);
    expect(made.instructions).toBeUndefined();
  });

  it("has only the tools its saved agent chose, whatever order they were saved in, and none that is not built", async () => {
    expect((await configured(worker, { say: "report" }, agent())).tools).toEqual(["report"]);
    expect((await configured(worker, { say: "report" }, agent({ tools: ["bash"] }))).tools).toEqual(["report", "run_command"]);
    expect((await configured(worker, { say: "report" }, agent({ tools: ["edit", "bash", "web_fetch", "read"] }))).tools).toEqual([
      "report",
      "read_file",
      "run_command",
    ]);
  });

  it("thinks with its saved agent's model, as hard as it says, and is told its instructions and then its skills", async () => {
    const saved = agent({
      instructions: "Be short.",
      thinking: "high",
      model: { connectionId: "c1", model: "m1" },
      skills: [SKILL],
    });
    const made = await configured(worker, { say: "report" }, saved);
    expect(made).toMatchObject({ model: { provider: "c1", modelId: "m1" }, thinkingLevel: "high" });
    expect(made.tools).toEqual(["report", "open_skill"]);
    expect(made.instructions).toBe(
      "Be short.\n\nSkills you can read with open_skill (skill, path):\n- notes: How we write (files: SKILL.md, a.md)",
    );
    expect((await configured(worker, { say: "report" }, { ...saved, instructions: "  " })).instructions).toMatch(/^Skills you can read/u);
  });

  it("is never offered what its kind leaves out, and a kind with nothing to choose has all its tools", async () => {
    const manager: AgentKind<null> = {
      name: "lead",
      instructions: "You lead.",
      tools: () => [tool("task_create"), tool("task_delete")],
      leaveOut: async () => ["task_delete"],
    };
    const made = await configured(manager, null, undefined);
    expect(made).toMatchObject({ tools: ["task_create"], extensions: ["lead"] });
    // What every agent of the kind is told is the kind's, so it is not stored with the conversation.
    expect(made.instructions).toBeUndefined();
    expect(mount(manager, null, { modelFor: () => ({ provider: "p", modelId: "m" }) }).extension.sections?.map(({ key }) => key)).toEqual([
      "preamble",
    ]);
  });
});
