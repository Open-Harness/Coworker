import { describe, expect, it } from "vitest";
import type { Message } from "~/modules/completion/types.ts";
import { turns } from "./service.ts";
import type { TurnDeps } from "./types.ts";

const stream = (parts: readonly object[]): Response =>
  new Response([...parts.map((part) => `data: ${JSON.stringify(part)}\n\n`), "data: [DONE]\n\n"].join(""), {
    headers: { "content-type": "text/event-stream" },
  });
const calls = (name: string, args: string) =>
  stream([
    {
      choices: [
        {
          delta: {
            role: "assistant",
            content: null,
            tool_calls: [{ index: 0, id: "c1", type: "function", function: { name, arguments: args } }],
          },
        },
      ],
    },
    { choices: [{ delta: {}, finish_reason: "tool_calls" }] },
  ]);
const says = (text: string) =>
  stream([{ choices: [{ delta: { role: "assistant", content: text } }] }, { choices: [{ delta: {}, finish_reason: "stop" }] }]);

function deps(answers: Response[], seen: string[]): TurnDeps & { readonly kept: Message[] } {
  const kept: Message[] = [{ role: "user", content: "Go" }];
  return {
    kept,
    thread: { messages: async () => kept, add: async (message) => void kept.push(message) },
    models: async () => ({
      connections: [{ id: "k", label: "K", source: "endpoint", check: { _tag: "Works" }, models: ["m"], prices: {} } as never],
      choice: { connection: "k", model: "m", thinking: "low" },
    }),
    call: async () => answers.shift() ?? says("done"),
    tools: [{ name: "act", description: "Does", parameters: {}, run: async (args) => (seen.push(JSON.stringify(args)), "Done.") }],
  };
}

describe("turns", () => {
  it("does what the model called, answers it, and asks again until it only speaks", async () => {
    const seen: string[] = [];
    const c = deps([calls("act", '{"a":1}'), says("That is all.")], seen);
    expect(await turns.run(c)).toEqual({ _tag: "Idle" });
    expect(seen).toEqual(['{"a":1}']);
    expect(c.kept.map((message) => message.role)).toEqual(["user", "assistant", "tool", "assistant"]);
  });

  it("answers a tool it was not offered in words and runs nothing", async () => {
    const seen: string[] = [];
    const c = deps([calls("drop", "{}"), says("Ok.")], seen);
    await turns.run(c);
    expect(seen).toEqual([]);
    expect(c.kept[2]).toMatchObject({ role: "tool", content: expect.stringContaining("not a tool") });
  });

  it("says why when no model can be had", async () => {
    const c = { ...deps([], []), models: async () => ({ connections: [], choice: null }) };
    expect(await turns.run(c)).toMatchObject({ _tag: "Failed" });
  });
});
