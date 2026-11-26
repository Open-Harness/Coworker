import { describe, expect, it } from "vitest";
import type { Message } from "~/modules/completion/types.ts";
import type { Walkthrough } from "~/modules/walkthrough/types.ts";
import { settingUp } from "./service.ts";
import type { SetUpDeps } from "./types.ts";

const stream = (parts: readonly object[]): Response =>
  new Response([...parts.map((part) => `data: ${JSON.stringify(part)}\n\n`), "data: [DONE]\n\n"].join(""), {
    headers: { "content-type": "text/event-stream" },
  });
const calls = (args: object) =>
  stream([
    {
      choices: [
        {
          delta: {
            role: "assistant",
            content: null,
            tool_calls: [{ index: 0, id: "c1", type: "function", function: { name: "set_up", arguments: JSON.stringify(args) } }],
          },
        },
      ],
    },
    { choices: [{ delta: {}, finish_reason: "tool_calls" }] },
  ]);
const stops = () =>
  stream([{ choices: [{ delta: { role: "assistant", content: "Nothing more." } }] }, { choices: [{ delta: {}, finish_reason: "stop" }] }]);

const question = (id: string, changes: readonly string[]) => ({
  id,
  ask: `What about ${id}?`,
  picks: ["Yes", "No"],
  best: "No",
  because: "Only you know",
  changes,
});

function deps(answers: Response[]): SetUpDeps & { readonly walks: Map<string, Walkthrough>; readonly kept: Message[] } {
  const walks = new Map<string, Walkthrough>();
  const kept: Message[] = [];
  return {
    kept,
    walks: Object.assign(new Map<string, Walkthrough>(), {
      get: async (id: string) => walks.get(id),
      put: async (walk: Walkthrough) => void walks.set(walk.id, walk),
    }) as never,
    thread: () => ({ messages: async () => kept, add: async (message) => void kept.push(message) }),
    models: async () => ({
      connections: [{ id: "k", label: "K", source: "endpoint", check: { _tag: "Works" }, models: ["m"], prices: {} } as never],
      choice: { connection: "k", model: "m", thinking: "low" },
    }),
    call: async () => answers.shift() ?? stops(),
    newId: () => "w1",
    problems: async () => [],
    make: async () => ({ _tag: "Made" }),
    comment: async () => undefined,
  };
}

describe("setting up", () => {
  it("keeps what the co-worker says, and tells it in words what code refused", async () => {
    const c = deps([calls({ event: { is: "asks", questions: [question("idle", [])] } }), stops()]);
    const started = await settingUp.start(c, "Ama", "Fewer bugs that sit");
    expect(started).toEqual({ walk: "w1", note: null });
    expect(await settingUp.get(c, "w1")).toMatchObject({ stage: "said", rounds: [] });
    expect(c.kept.find((message) => message.role === "tool")).toMatchObject({ content: expect.stringContaining("changes no line") });
  });

  it("does not let the co-worker say what is the person's", async () => {
    const c = deps([calls({ event: { is: "make it", by: "Juno" } }), stops()]);
    await settingUp.start(c, "Ama", "Fewer bugs");
    expect(c.kept.find((message) => message.role === "tool")).toMatchObject({ content: expect.stringContaining("for the person") });
  });

  it("takes the person's event with who they are, and refuses a make before ten cases", async () => {
    const c = deps([calls({ event: { is: "asks", questions: [question("docs", ["workflow/bug"])] } }), stops()]);
    await settingUp.start(c, "Ama", "Fewer bugs");
    expect(await settingUp.say(c, "w1", "Chidi", { is: "make it", by: "Ama" })).toMatchObject({ _tag: "Refused" });
    expect(await settingUp.say(c, "w1", "Chidi", { is: "nonsense" })).toMatchObject({ _tag: "Refused" });
    expect(await settingUp.say(c, "nope", "Chidi", { is: "make it" })).toEqual({ _tag: "Gone" });
  });
});
