import type { Usage } from "~/modules/choosing/types.ts";
import type { Asked, Call, Message, Replied } from "../types.ts";

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const numberOf = (value: unknown): number => (typeof value === "number" ? value : 0);
const textOf = (value: unknown): string => (typeof value === "string" ? value : "");

interface Part {
  id: string;
  name: string;
  args: string;
}

function body({ model, thinking, messages, tools }: Asked): string {
  return JSON.stringify({
    model,
    messages,
    stream: true,
    stream_options: { include_usage: true },
    ...(tools.length === 0
      ? {}
      : { tools: tools.map(({ name, description, parameters }) => ({ type: "function", function: { name, description, parameters } })) }),
    ...(thinking === "off" ? {} : { reasoning_effort: thinking }),
  });
}

function usageOf(value: unknown): Usage | undefined {
  if (!isRecord(value)) return undefined;
  const prompt = numberOf(value["prompt_tokens"]);
  const details = value["prompt_tokens_details"];
  const cached = isRecord(details) ? numberOf(details["cached_tokens"]) : 0;
  return { input: Math.max(prompt - cached, 0), cached, output: numberOf(value["completion_tokens"]) };
}

/** Reads the stream to its end: the words, the calls it made (their arguments arrive in pieces), and what it used. */
async function read(stream: ReadableStream<Uint8Array>): Promise<{ text: string; parts: Map<number, Part>; usage: Usage | undefined }> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const parts = new Map<number, Part>();
  let [text, usage, rest] = ["", undefined as Usage | undefined, ""];
  for (;;) {
    const next = await reader.read();
    if (next.done) break;
    rest += decoder.decode(next.value, { stream: true });
    const lines = rest.split("\n");
    rest = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:") || line.includes("[DONE]")) continue;
      const chunk: unknown = JSON.parse(line.slice(5));
      if (!isRecord(chunk)) continue;
      usage = usageOf(chunk["usage"]) ?? usage;
      const choice = Array.isArray(chunk["choices"]) ? chunk["choices"][0] : undefined;
      const delta = isRecord(choice) && isRecord(choice["delta"]) ? choice["delta"] : undefined;
      if (delta === undefined) continue;
      text += textOf(delta["content"]);
      for (const call of Array.isArray(delta["tool_calls"]) ? delta["tool_calls"] : []) {
        if (!isRecord(call)) continue;
        const at = numberOf(call["index"]);
        const part = parts.get(at) ?? { id: "", name: "", args: "" };
        const fn = isRecord(call["function"]) ? call["function"] : {};
        parts.set(at, {
          id: textOf(call["id"]) || part.id,
          name: textOf(fn["name"]) || part.name,
          args: part.args + textOf(fn["arguments"]),
        });
      }
    }
  }
  return { text, parts, usage };
}

/** Asks the model through the workspace, which holds the credential. Anything that goes wrong is a value, with the words it was said in. */
export async function ask(call: Call, asked: Asked): Promise<Replied> {
  let response: Response;
  try {
    response = await call(`/${asked.connection}/v1/chat/completions`, body(asked));
  } catch (error) {
    return { _tag: "Failed", status: 0, says: error instanceof Error ? error.message : String(error) };
  }
  if (!response.ok || response.body === null)
    return { _tag: "Failed", status: response.status, says: (await response.text().catch(() => "")).slice(0, 300) };
  try {
    const { text, parts, usage } = await read(response.body);
    const calls = [...parts.entries()].sort(([a], [b]) => a - b).map(([, part]) => part);
    const message: Extract<Message, { role: "assistant" }> = {
      role: "assistant",
      content: text === "" ? null : text,
      ...(calls.length === 0
        ? {}
        : {
            tool_calls: calls.map((call, n) => ({
              id: call.id === "" ? `call_${n}` : call.id,
              type: "function" as const,
              function: { name: call.name, arguments: call.args },
            })),
          }),
    };
    return { _tag: "Replied", message, usage: usage ?? { input: 0, cached: 0, output: 0 } };
  } catch (error) {
    return { _tag: "Failed", status: 0, says: `The answer broke off: ${error instanceof Error ? error.message : String(error)}` };
  }
}
