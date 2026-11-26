import { describe, expect, it } from "vitest";
import { completion } from "./service.ts";

const stream = (...chunks: unknown[]): Response =>
  new Response([...chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`), "data: [DONE]\n\n"].join(""), {
    headers: { "content-type": "text/event-stream" },
  });
const asked = { connection: "c1", model: "m", thinking: "low", messages: [{ role: "user", content: "hi" }], tools: [] } as const;

describe("completion", () => {
  it("puts the pieces of a call together and counts what was not cached", async () => {
    const sent: string[] = [];
    const replied = await completion.ask(async (path, body) => {
      sent.push(path, body);
      return stream(
        { choices: [{ delta: { tool_calls: [{ index: 0, id: "call_1", function: { name: "report", arguments: '{"re' } }] } }] },
        { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'sult":"done"}' } }] } }] },
        { choices: [], usage: { prompt_tokens: 1000, completion_tokens: 200, prompt_tokens_details: { cached_tokens: 400 } } },
      );
    }, asked);
    expect(sent[0]).toBe("/c1/v1/chat/completions");
    expect(JSON.parse(sent[1] ?? "{}")).toMatchObject({ stream: true, reasoning_effort: "low" });
    expect(replied).toMatchObject({ _tag: "Replied", usage: { input: 600, cached: 400, output: 200 } });
    expect(replied._tag === "Replied" ? replied.message.tool_calls : []).toEqual([
      { id: "call_1", type: "function", function: { name: "report", arguments: '{"result":"done"}' } },
    ]);
  });

  it("says what a refusal said, and what it was when nothing answered", async () => {
    expect(await completion.ask(async () => new Response("no key", { status: 401 }), asked)).toEqual({
      _tag: "Failed",
      status: 401,
      says: "no key",
    });
    const none = await completion.ask(async () => Promise.reject(new Error("offline")), asked);
    expect(none).toEqual({ _tag: "Failed", status: 0, says: "offline" });
  });

  it("sends no thinking when it is off", async () => {
    let body = "";
    await completion.ask(async (_, sent) => ((body = sent), stream()), { ...asked, thinking: "off" });
    expect(JSON.parse(body)).not.toHaveProperty("reasoning_effort");
  });
});
