/* TRACE.turns, cut into the messages the thread said: each begins at something it said, and the calls that follow stay together. */
import { TRACE } from "../../world";

export type Turn = (typeof TRACE.turns)[number];
export type Call = Extract<Turn, { kind: "call" }>;
export type Part = { kind: "say"; at: string; text: string } | { kind: "think"; at: string; text: string } | { kind: "calls"; calls: Call[] };
export interface Message { readonly at: string; readonly parts: Part[] }

export function messages(): Message[] {
  const out: Message[] = [];
  for (const t of TRACE.turns) {
    const open = out[out.length - 1];
    // Thinking comes before what it led to: it opens the message that the next thing said belongs to.
    const isOnlyThinking = open !== undefined && open.parts.every((p) => p.kind === "think");
    if (t.kind === "think" || (t.kind === "say" && !isOnlyThinking) || open === undefined) out.push({ at: t.at, parts: [] });
    const m = out[out.length - 1]!;
    const last = m.parts[m.parts.length - 1];
    if (t.kind === "call") { if (last?.kind === "calls") last.calls.push(t); else m.parts.push({ kind: "calls", calls: [t] }); }
    else m.parts.push({ kind: t.kind, at: t.at, text: t.text });
  }
  return out;
}
