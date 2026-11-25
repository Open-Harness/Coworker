/*
 * The fast tier's scripted model servers, one per wire format a manager speaks: an OpenAI-compatible chat server and
 * Anthropic's messages API. They answer a streamed request the way a real model would: "add a task: X" is the tool call
 * `task_create`, a tool result is thanked in words, anything else is greeted. They record what each call carried (never
 * a credential's value), which the tests read back at `/__seen`.
 */

export interface SeenCall {
  readonly host: string;
  readonly path: string;
  readonly model: string;
  /** Whether the right credential was sent, wrong or none. */
  readonly credential: "right" | "wrong" | "none";
  readonly tools: readonly string[];
  /** The names of the headers sent: the SDK's own placeholder credential must not arrive under any of them. */
  readonly headerNames: readonly string[];
}

export const seen: SeenCall[] = [];

type Json = Readonly<Record<string, unknown>>;
const isRecord = (value: unknown): value is Json => typeof value === "object" && value !== null;
const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

const textOf = (content: unknown): string =>
  typeof content === "string"
    ? content
    : list(content)
        .map((part) => (isRecord(part) && typeof part["text"] === "string" ? part["text"] : ""))
        .join("\n");

/** What to do next, from the conversation so far. */
type Step = { readonly kind: "call"; readonly tool: string; readonly args: Json } | { readonly kind: "say"; readonly text: string };

/** The text of a tool's result in the last message: OpenAI's `tool` message, or Anthropic's `tool_result` block. */
function toolResultIn(last: unknown): string | undefined {
  if (!isRecord(last)) return undefined;
  if (last["role"] === "tool") return textOf(last["content"]);
  const block = list(last["content"]).find((part) => isRecord(part) && part["type"] === "tool_result");
  return isRecord(block) ? textOf(block["content"]) : undefined;
}

function nextStep(model: string, last: unknown, tools: readonly string[]): Step {
  const result = toolResultIn(last);
  if (result !== undefined) return { kind: "say", text: `Done. ${result.slice(0, 160)}` };
  const title = /\badd (?:a )?task:?\s+(.+)$/isu.exec(isRecord(last) ? textOf(last["content"]) : "")?.[1]?.trim();
  if (title !== undefined && tools.includes("task_create")) return { kind: "call", tool: "task_create", args: { title } };
  return { kind: "say", text: `Hello, I am ${model}.` };
}

const encoder = new TextEncoder();
const slowly = (last: unknown): number => (/\btake your time\b/iu.test(JSON.stringify(last)) ? 25 : 0);

function stream(chunks: readonly string[], delayMs: number): Response {
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const chunk of chunks) {
        if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(body, { headers: { "content-type": "text/event-stream" } });
}

const data = (value: unknown): string => `data: ${JSON.stringify(value)}\n\n`;
const event = (name: string, value: unknown): string => `event: ${name}\n${data(value)}`;

function openAIChunks(model: string, step: Step): readonly string[] {
  const chunk = (delta: Json, finish: string | null) =>
    data({
      id: "cmpl_scripted",
      object: "chat.completion.chunk",
      created: 0,
      model,
      choices: [{ index: 0, delta, finish_reason: finish }],
    });
  const usage = data({
    id: "cmpl_scripted",
    object: "chat.completion.chunk",
    created: 0,
    model,
    choices: [],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  });
  if (step.kind === "say") {
    const [first = "", ...rest] = step.text.split(" ");
    return [
      chunk({ role: "assistant", content: first }, null),
      ...rest.map((word) => chunk({ content: ` ${word}` }, null)),
      chunk({}, "stop"),
      usage,
      "data: [DONE]\n\n",
    ];
  }
  const call = { index: 0, id: "call_scripted_1", type: "function" };
  return [
    chunk({ role: "assistant", content: null, tool_calls: [{ ...call, function: { name: step.tool, arguments: "" } }] }, null),
    chunk({ tool_calls: [{ index: 0, function: { arguments: JSON.stringify(step.args) } }] }, null),
    chunk({}, "tool_calls"),
    usage,
    "data: [DONE]\n\n",
  ];
}

function anthropicChunks(model: string, step: Step): readonly string[] {
  const head = event("message_start", {
    type: "message_start",
    message: {
      id: "msg_scripted",
      type: "message",
      role: "assistant",
      model,
      content: [],
      stop_reason: null,
      usage: { input_tokens: 10, output_tokens: 1 },
    },
  });
  const block =
    step.kind === "say"
      ? [
          event("content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }),
          event("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: step.text } }),
        ]
      : [
          event("content_block_start", {
            type: "content_block_start",
            index: 0,
            content_block: { type: "tool_use", id: "toolu_scripted_1", name: step.tool, input: {} },
          }),
          event("content_block_delta", {
            type: "content_block_delta",
            index: 0,
            delta: { type: "input_json_delta", partial_json: JSON.stringify(step.args) },
          }),
        ];
  return [
    head,
    ...block,
    event("content_block_stop", { type: "content_block_stop", index: 0 }),
    event("message_delta", {
      type: "message_delta",
      delta: { stop_reason: step.kind === "say" ? "end_turn" : "tool_use" },
      usage: { output_tokens: 5 },
    }),
    event("message_stop", { type: "message_stop" }),
  ];
}

const toolNames = (tools: unknown): readonly string[] =>
  list(tools).flatMap((tool) => {
    const named = isRecord(tool) && isRecord(tool["function"]) ? tool["function"]["name"] : isRecord(tool) ? tool["name"] : undefined;
    return typeof named === "string" ? [named] : [];
  });

/** A streamed chat request, answered from the script. `credential` says whether the request carried the right one. */
export async function scriptedChat(request: Request, api: "openai" | "anthropic", credential: SeenCall["credential"]): Promise<Response> {
  const parsed: unknown = JSON.parse(await request.text());
  const body = isRecord(parsed) ? parsed : {};
  const model = typeof body["model"] === "string" ? body["model"] : "unknown";
  const tools = toolNames(body["tools"]);
  const { host, pathname } = new URL(request.url);
  seen.push({ host, path: pathname, model, credential, tools, headerNames: [...request.headers.keys()].sort() });
  if (credential !== "right") {
    return Response.json(
      { type: "error", error: { type: "authentication_error", message: "invalid credential for the scripted model" } },
      { status: 401 },
    );
  }
  const last = list(body["messages"]).at(-1);
  const step = nextStep(model, last, tools);
  return stream(api === "openai" ? openAIChunks(model, step) : anthropicChunks(model, step), slowly(last));
}
