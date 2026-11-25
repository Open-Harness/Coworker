import type { Step, Turn } from "../types.ts";

type Json = Readonly<Record<string, unknown>>;
const isRecord = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);
const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

const textOf = (content: unknown): string =>
  typeof content === "string"
    ? content
    : list(content)
        .map((part) => (isRecord(part) && typeof part["text"] === "string" ? part["text"] : ""))
        .join("\n");

/** A chat request, as the script reads it: its model, its turns and the names of the tools offered. */
export interface ChatRequest {
  readonly model: string;
  readonly turns: readonly Turn[];
  readonly tools: readonly string[];
  readonly stream: boolean;
}

export function readChat(body: unknown): ChatRequest | undefined {
  if (!isRecord(body) || !Array.isArray(body["messages"])) return undefined;
  // A tool's result names its tool through the id of the call it answers.
  const names = new Map<string, string>();
  const turns = body["messages"].flatMap((message): Turn[] => {
    if (!isRecord(message) || typeof message["role"] !== "string") return [];
    for (const call of list(message["tool_calls"])) {
      const named = isRecord(call) && isRecord(call["function"]) ? call["function"]["name"] : undefined;
      if (isRecord(call) && typeof call["id"] === "string" && typeof named === "string") names.set(call["id"], named);
    }
    const id = message["tool_call_id"];
    const tool = typeof id === "string" ? names.get(id) : undefined;
    return [{ role: message["role"], text: textOf(message["content"]), ...(tool === undefined ? {} : { tool }) }];
  });
  const tools = list(body["tools"]).flatMap((tool) => {
    const named = isRecord(tool) && isRecord(tool["function"]) ? tool["function"]["name"] : undefined;
    return typeof named === "string" ? [named] : [];
  });
  return {
    model: typeof body["model"] === "string" ? body["model"] : "coworker-scripted-mini",
    turns,
    tools,
    stream: body["stream"] === true,
  };
}

const USAGE = { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 };
const CALL = { id: "call_dt_1", type: "function" };

/** The whole answer, as a non-streamed completion. */
export function completion(model: string, step: Step): Response {
  const message =
    step.kind === "say"
      ? { role: "assistant", content: step.text }
      : {
          role: "assistant",
          content: null,
          tool_calls: [{ ...CALL, function: { name: step.tool, arguments: JSON.stringify(step.args) } }],
        };
  const finish = step.kind === "say" ? "stop" : "tool_calls";
  return Response.json({
    id: "cmpl_dt",
    object: "chat.completion",
    created: 0,
    model,
    choices: [{ index: 0, message, finish_reason: finish }],
    usage: USAGE,
  });
}

/** The same answer as server-sent chunks, in the shape OpenAI streams. */
export function streamed(model: string, step: Step): Response {
  const data = (value: unknown): string => `data: ${JSON.stringify(value)}\n\n`;
  const chunk = (delta: Json, finish: string | null): string =>
    data({ id: "cmpl_dt", object: "chat.completion.chunk", created: 0, model, choices: [{ index: 0, delta, finish_reason: finish }] });
  const end = [data({ id: "cmpl_dt", object: "chat.completion.chunk", created: 0, model, choices: [], usage: USAGE }), "data: [DONE]\n\n"];
  const chunks =
    step.kind === "say"
      ? [chunk({ role: "assistant", content: step.text }, null), chunk({}, "stop"), ...end]
      : [
          chunk(
            { role: "assistant", content: null, tool_calls: [{ index: 0, ...CALL, function: { name: step.tool, arguments: "" } }] },
            null,
          ),
          chunk({ tool_calls: [{ index: 0, function: { arguments: JSON.stringify(step.args) } }] }, null),
          chunk({}, "tool_calls"),
          ...end,
        ];
  return new Response(chunks.join(""), { headers: { "content-type": "text/event-stream", "cache-control": "no-cache" } });
}
