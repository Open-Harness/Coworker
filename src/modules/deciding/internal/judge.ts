import { completion } from "~/modules/completion/service.ts";
import type { Call, Models } from "~/modules/completion/types.ts";
import { intake } from "~/modules/intake/service.ts";
import type { Hears, Item, Judgement, OpenWork } from "~/modules/intake/types.ts";
import type { AgentRole } from "~/modules/playbook/types.ts";
import { threads } from "~/modules/threads/service.ts";

const JUDGE = {
  name: "judge",
  description: "Say, for every kind of every manager, whether this is that kind of thing, why, and how well it fits.",
  parameters: {
    type: "object",
    properties: {
      verdicts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            manager: { type: "string" },
            kind: { type: "string" },
            is: { type: "boolean" },
            why: { type: "string" },
            fit: { type: "number", description: "0 to 1" },
          },
          required: ["manager", "kind", "is", "why", "fit"],
        },
      },
      joins: { type: "string", description: "The id of open work that this is about, if it is." },
    },
    required: ["verdicts"],
  },
} as const;

/** A model that can only read says what kind of thing came in. It grants nothing: what it says is narrowed, and code decides. */
export async function judge(
  models: () => Promise<Models>,
  call: Call,
  item: Item,
  hears: readonly Hears[],
  open: readonly OpenWork[],
  agent: AgentRole | undefined,
): Promise<Judgement> {
  const { system, user } = intake.question(item, hears, open);
  const { chosen } = completion.pick(await models(), agent?.model ?? "inherit");
  if (chosen._tag === "None") return { _tag: "CouldNot", why: chosen.why };
  const replied = await completion.ask(call, {
    connection: chosen.connection,
    model: chosen.model,
    thinking: chosen.thinking,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    tools: [JUDGE],
  });
  if (replied._tag === "Failed")
    return { _tag: "CouldNot", why: `The judge did not answer${replied.status === 0 ? "" : ` (${replied.status})`}: ${replied.says}` };
  const called = replied.message.tool_calls?.find((one) => one.function.name === "judge");
  if (called === undefined) return { _tag: "CouldNot", why: "The judge did not say which kind this is." };
  const read = threads.read("judge", safe(called.function.arguments));
  return read._tag === "Wrong" ? { _tag: "CouldNot", why: read.says } : intake.verdicts(read.args, hears, open);
}

function safe(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
