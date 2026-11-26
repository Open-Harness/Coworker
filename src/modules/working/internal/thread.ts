import type { Message, WorkingDeps } from "../types.ts";
import { agentOf } from "./brief.ts";
import { completion } from "~/modules/completion/service.ts";
import { spend } from "./spend.ts";
import { offered } from "./tools/index.ts";
import { serverTools } from "./tools/mcp.ts";
import type { Call } from "./tool.ts";

/* One agent's conversation, as far as it can go: ask the model, do what it called, ask again; until it ends its part, has nothing more to say, or must wait. */

export type Turned =
  | { readonly _tag: "Ended" }
  | { readonly _tag: "Idle" }
  /** `model`: it waits because this model did not answer. */
  | { readonly _tag: "Waits"; readonly why: string; readonly model?: string }
  /** It asked a person at a call, and goes on from there when it is answered. */
  | { readonly _tag: "Parked" };

const MOST_CALLS = 80;
const branchOf = (work: string): string => `co-worker/${work}`;
export const branchFor = branchOf;

const parsed = (text: string): unknown => {
  try {
    return text.trim() === "" ? {} : JSON.parse(text);
  } catch {
    return Symbol.for("not json");
  }
};

/** The calls of the last thing the model said that have no result yet. */
export function pendingOf(
  messages: readonly Message[],
): readonly { readonly id: string; readonly function: { readonly name: string; readonly arguments: string } }[] {
  const last = messages.findLast((message) => message.role === "assistant");
  return last?.role === "assistant"
    ? (last.tool_calls ?? []).filter((one) => !messages.some((message) => message.role === "tool" && message.tool_call_id === one.id))
    : [];
}

export async function turn(c: WorkingDeps, id: string): Promise<Turned> {
  for (let calls = 0; calls < MOST_CALLS; calls += 1) {
    const row = c.store.thread(id);
    const work = row === undefined ? undefined : c.store.work(row.work);
    const playbook = work === undefined ? undefined : c.playbook(work.version);
    const agent = row === undefined || playbook === undefined ? undefined : agentOf(playbook, row.agent);
    if (row === undefined || work === undefined || playbook === undefined || agent === undefined) return { _tag: "Ended" };
    if (row.state === "ended" || work.ended !== null) return { _tag: "Ended" };
    const more = await serverTools(c.outside, work.mandate);
    const { specs, may } = offered(row.role, agent, work.mandate, { account: work.from.account, place: work.from.place }, more);
    const messages = c.store.messages(id);
    const at = messages.findLastIndex((message) => message.role === "assistant");
    const last = at < 0 ? undefined : messages[at];
    const pending =
      last?.role === "assistant"
        ? (last.tool_calls ?? []).filter((one) => !messages.some((message) => message.role === "tool" && message.tool_call_id === one.id))
        : [];
    if (last?.role === "assistant" && pending.length > 0) {
      for (const one of pending) {
        const tool = may.get(one.function.name);
        const args = parsed(one.function.arguments);
        const call: Call = { c, work, thread: row, id: `${id}.${at}.${one.id}`, playbook, agent, branch: branchOf(work.id) };
        const result =
          tool === undefined
            ? ({ _tag: "Said", text: `${one.function.name} is not a tool you are offered.`, ok: false } as const)
            : typeof args === "symbol"
              ? ({ _tag: "Said", text: `The arguments of ${one.function.name} were not JSON.`, ok: false } as const)
              : await tool.run(call, args);
        if (result._tag === "Waits") return { _tag: "Waits", why: result.why };
        if (result._tag === "Parks") return { _tag: "Parked" };
        c.store.addMessage(id, { role: "tool", tool_call_id: one.id, content: result.text });
        if (result._tag === "Ends") return { _tag: "Ended" };
      }
      continue;
    }
    if (last !== undefined && messages.at(-1)?.role === "assistant") return { _tag: "Idle" };
    const { chosen, on } = completion.pick(await c.outside.models(), agent.model);
    if (chosen._tag === "None") return { _tag: "Waits", why: chosen.why };
    const replied = await completion.ask(c.outside.call, {
      connection: chosen.connection,
      model: chosen.model,
      thinking: chosen.thinking,
      messages,
      tools: specs,
    });
    if (replied._tag === "Failed")
      return {
        _tag: "Waits",
        why: `The model ${chosen.model} did not answer${replied.status === 0 ? "" : ` (${replied.status})`}: ${replied.says}`,
        model: chosen.model,
      };
    const callId = `${id}:${messages.length}`;
    c.store.transaction(() => {
      c.store.addMessage(id, replied.message);
      c.store.putThread({ ...(c.store.thread(id) ?? row), model: chosen.model });
    });
    const room = spend(c, row, callId, chosen, on, replied.usage);
    if (room.over !== null) return { _tag: "Idle" };
  }
  return { _tag: "Idle" };
}
