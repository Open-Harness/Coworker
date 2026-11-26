import { describe, expect, it } from "vitest";
import { fakeModel } from "./service.ts";

const URL_BASE = "https://fake-model.test";
const tool = (name: string) => ({ type: "function", function: { name, parameters: { type: "object" } } });
const TOOLS = ["triage_accept", "triage_ignore", "reply_thread", "task_create", "report"].map(tool);

const chat = (messages: unknown[], extra: Record<string, unknown> = {}, key?: string) =>
  fakeModel.handle(
    new Request(`${URL_BASE}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(key === undefined ? {} : { authorization: `Bearer ${key}` }) },
      body: JSON.stringify({ model: "coworker-scripted-mini", messages, tools: TOOLS, ...extra }),
    }),
    { key },
  );

/** The one tool call of a non-streamed answer, or its text. */
async function said(response: Response) {
  const body = (await response.json()) as {
    choices: { message: { content: string | null; tool_calls?: { function: { name: string; arguments: string } }[] } }[];
  };
  const message = body.choices[0]?.message;
  const call = message?.tool_calls?.[0]?.function;
  return call === undefined ? { text: message?.content } : { tool: call.name, args: JSON.parse(call.arguments) as unknown };
}

describe("coworker-fake-model", () => {
  it("lists its models like an OpenAI-compatible endpoint", async () => {
    const response = await fakeModel.handle(new Request(`${URL_BASE}/v1/models`), {});
    expect(await response.json()).toMatchObject({
      object: "list",
      data: [{ id: "coworker-scripted-mini" }, { id: "coworker-scripted-large" }],
    });
  });

  it("accepts an explicit candidate, ignores an inferred one, and answers a follow-up on its Task", async () => {
    const candidate = (kind: string) => [
      { role: "user", content: `[Ama]\nCandidate (${kind}), from email. Trigger: tr_7 Please export the docs` },
    ];
    expect(await said(await chat(candidate("explicit")))).toEqual({ tool: "triage_accept", args: { trigger: "tr_7" } });
    expect(await said(await chat(candidate("inferred")))).toMatchObject({
      tool: "triage_ignore",
      args: { trigger: "tr_7", wouldAccept: true },
    });
    const followUp = [{ role: "user", content: "Follow-up on DT-14 from Ama: and the images?" }];
    expect(await said(await chat(followUp))).toMatchObject({ tool: "reply_thread", args: { task: "DT-14" } });
  });

  it("tells a new Task where it came from once it is accepted", async () => {
    const messages = [
      { role: "user", content: "Candidate (explicit), from github. Trigger: tr_9" },
      {
        role: "assistant",
        content: null,
        tool_calls: [{ id: "c1", type: "function", function: { name: "triage_accept", arguments: "{}" } }],
      },
      { role: "tool", tool_call_id: "c1", content: '{"task":"DT-3","title":"Export docs"}' },
    ];
    const reply = await said(await chat(messages));
    expect(reply).toMatchObject({ tool: "reply_thread", args: { task: "DT-3" } });
  });

  it("turns 'add a task' into task_create, a worker's run into a report, and anything else into words", async () => {
    expect(await said(await chat([{ role: "user", content: "[Ama]\nplease add a task: Write the launch post" }]))).toEqual({
      tool: "task_create",
      args: { title: "Write the launch post" },
    });
    expect(await said(await chat([{ role: "user", content: "You are working as a writer on DT-1" }]))).toMatchObject({
      tool: "report",
      args: { report: "ready" },
    });
    expect(await said(await chat([{ role: "user", content: "hello there" }]))).toEqual({ text: "Noted: hello there" });
  });

  it("starts a run when asked, runs the command in its brief, and reports what happened", async () => {
    expect(
      await said(await chat([{ role: "user", content: "[Ama]\nstart a tester on DT-2 run: npm test" }], { tools: [tool("run_start")] })),
    ).toEqual({
      tool: "run_start",
      args: { task: "DT-2", role: "tester", brief: "run: npm test" },
    });
    const brief = "You are working as a tester on DT-2.\nrun: git clone x && npm test";
    const asked = { role: "user", content: brief };
    expect(await said(await chat([asked], { tools: [...TOOLS, tool("run_command")] }))).toEqual({
      tool: "run_command",
      args: { command: "git clone x && npm test" },
    });
    const called = (name: string) => ({
      role: "assistant",
      content: null,
      tool_calls: [{ id: "c1", type: "function", function: { name, arguments: "{}" } }],
    });
    const ran = (text: string) => [asked, called("run_command"), { role: "tool", tool_call_id: "c1", content: text }];
    const passed = await said(await chat(ran("Exit 0 in app.\n# tests 1\n# pass 1"), {}));
    expect(passed).toMatchObject({ tool: "report", args: { report: "ready" } });
    expect(JSON.stringify(passed)).toContain("# pass 1");
    expect(await said(await chat(ran("Exit 1 in app.\nnpm ERR!"), {}))).toMatchObject({ tool: "report", args: { report: "failed" } });
    // After its report, a run is done.
    const reported = [asked, called("report"), { role: "tool", tool_call_id: "c1", content: "Reported." }];
    expect(await said(await chat(reported, {}))).toEqual({ text: "Finished." });
  });

  it("never asks for a tool that was not offered", async () => {
    const answer = await said(await chat([{ role: "user", content: "add a task: x" }], { tools: [] }));
    expect(answer).toEqual({ text: "I would use task_create, but it is not offered." });
  });

  it("streams the same answer as server-sent chunks that end with [DONE]", async () => {
    const response = await chat([{ role: "user", content: "add a task: Ship it" }], { stream: true });
    expect(response.headers.get("content-type")).toBe("text/event-stream");
    const lines = (await response.text()).split("\n\n").filter((line) => line !== "");
    expect(lines.at(-1)).toBe("data: [DONE]");
    const chunks = lines.slice(0, -1).map(
      (line) =>
        JSON.parse(line.slice("data: ".length)) as {
          choices: { delta?: { tool_calls?: { function: { name?: string; arguments?: string } }[] }; finish_reason: string | null }[];
        },
    );
    const calls = chunks.flatMap((chunk) => chunk.choices[0]?.delta?.tool_calls ?? []);
    expect(calls[0]?.function.name).toBe("task_create");
    expect(JSON.parse(calls.map((call) => call.function.arguments ?? "").join(""))).toEqual({ title: "Ship it" });
    expect(chunks.map((chunk) => chunk.choices[0]?.finish_reason)).toContain("tool_calls");
  });

  it("refuses a wrong key when one is set, and a body that is not a chat request", async () => {
    const wrong = await fakeModel.handle(new Request(`${URL_BASE}/v1/models`, { headers: { authorization: "Bearer nope" } }), {
      key: "right",
    });
    expect(wrong.status).toBe(401);
    const right = await fakeModel.handle(new Request(`${URL_BASE}/v1/models`, { headers: { authorization: "Bearer right" } }), {
      key: "right",
    });
    expect(right.status).toBe(200);
    expect((await chat("nonsense" as unknown as unknown[])).status).toBe(400);
    expect((await fakeModel.handle(new Request(`${URL_BASE}/v1/other`), {})).status).toBe(404);
  });
});
