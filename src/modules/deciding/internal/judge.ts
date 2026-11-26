import type { Agent } from "~/modules/agent/types.ts";
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
  ask: Agent["ask"],
  item: Item,
  hears: readonly Hears[],
  open: readonly OpenWork[],
  agent: AgentRole | undefined,
): Promise<Judgement> {
  const { system, user } = intake.question(item, hears, open);
  const replied = await ask({
    instructions: agent === undefined ? system : `${agent.told.trim()}\n\n${system}`,
    text: user,
    model: agent?.model ?? "inherit",
    tool: JUDGE,
  });
  if (replied._tag !== "Said") return { _tag: "CouldNot", why: `The judge did not answer: ${whyOf(replied)}` };
  if (replied.called === null || replied.called === undefined)
    return { _tag: "CouldNot", why: "The judge did not say which kind this is." };
  const read = threads.read("judge", replied.called);
  return read._tag === "Wrong" ? { _tag: "CouldNot", why: read.says } : intake.verdicts(read.args, hears, open);
}

type NotSaid = Exclude<Awaited<ReturnType<Agent["ask"]>>, { readonly _tag: "Said" }>;

function whyOf(error: NotSaid): string {
  switch (error._tag) {
    case "NotBuilt":
      return `${error.what} is not built yet`;
    case "OverBudget":
      return `${error.spent} of ${error.limit} dollars is spent`;
    case "OutOfTurns":
      return `it took ${error.turns} turns`;
    default:
      return error.why;
  }
}
