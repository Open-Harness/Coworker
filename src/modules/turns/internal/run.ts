import { completion } from "~/modules/completion/service.ts";
import type { Message } from "~/modules/completion/types.ts";
import type { TurnDeps, Turned } from "../types.ts";

/** The most model calls in one go: a model that never stops calling is stopped. */
const MOST = 40;

type Pending = NonNullable<Extract<Message, { role: "assistant" }>["tool_calls"]>[number];

function parsed(text: string): unknown {
  try {
    return text.trim() === "" ? {} : JSON.parse(text);
  } catch {
    return Symbol.for("not json");
  }
}

/** What the last assistant message called, that no tool message has answered. */
function pendingOf(messages: readonly Message[]): readonly Pending[] {
  const at = messages.findLastIndex((message) => message.role === "assistant");
  const last = at < 0 ? undefined : messages[at];
  if (last?.role !== "assistant") return [];
  return (last.tool_calls ?? []).filter((call) => !messages.some((message) => message.role === "tool" && message.tool_call_id === call.id));
}

async function answerCalls(c: TurnDeps, calls: readonly Pending[]): Promise<void> {
  for (const call of calls) {
    const tool = c.tools.find(({ name }) => name === call.function.name);
    const args = parsed(call.function.arguments);
    const content =
      tool === undefined
        ? `${call.function.name} is not a tool you are offered.`
        : typeof args === "symbol"
          ? `The arguments of ${call.function.name} were not JSON.`
          : await tool.run(args);
    await c.thread.add({ role: "tool", tool_call_id: call.id, content });
  }
}

export async function run(c: TurnDeps): Promise<Turned> {
  for (let calls = 0; calls < MOST; calls += 1) {
    const messages = await c.thread.messages();
    const pending = pendingOf(messages);
    if (pending.length > 0) {
      await answerCalls(c, pending);
      continue;
    }
    if (messages.at(-1)?.role === "assistant") return { _tag: "Idle" };
    const { chosen } = completion.pick(await c.models(), "inherit");
    if (chosen._tag === "None") return { _tag: "Failed", why: chosen.why };
    const replied = await completion.ask(c.call, {
      connection: chosen.connection,
      model: chosen.model,
      thinking: chosen.thinking,
      messages,
      tools: c.tools.map(({ name, description, parameters }) => ({ name, description, parameters })),
    });
    if (replied._tag === "Failed")
      return { _tag: "Failed", why: `The model did not answer${replied.status === 0 ? "" : ` (${replied.status})`}: ${replied.says}` };
    await c.thread.add(replied.message);
  }
  return { _tag: "Idle" };
}
