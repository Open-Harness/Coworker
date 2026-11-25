import type { AssistantMessage } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import type { WorkspaceLink } from "~/modules/manager/types.ts";
import type { ModelCall, ModelRoute } from "~/modules/models/types.ts";
import { workspaceBrain } from "./service.ts";

const SECRET_LOOKING = "not-a-key";

const completion = (text: string): Response =>
  new Response(
    [
      {
        id: "c",
        object: "chat.completion.chunk",
        created: 0,
        model: "m",
        choices: [{ index: 0, delta: { role: "assistant", content: text }, finish_reason: null }],
      },
      { id: "c", object: "chat.completion.chunk", created: 0, model: "m", choices: [{ index: 0, delta: {}, finish_reason: "stop" }] },
    ]
      .map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`)
      .concat("data: [DONE]\n\n")
      .join(""),
    { headers: { "content-type": "text/event-stream" } },
  );

const OPENAI: ModelRoute = { _tag: "Route", connectionId: "endpoint_1", label: "Ours", source: "endpoint", api: "openai-completions" };

/** A workspace that answers model calls as scripted, and keeps what it was asked. */
function workspace(route: ModelRoute, answer: (call: ModelCall) => Response | Promise<Response> = () => completion("Hi there")) {
  const calls: ModelCall[] = [];
  const link: WorkspaceLink = {
    recordActions: async () => undefined,
    ask: async () => ({ _tag: "Asked" }),
    follow: async () => undefined,
    sandbox: async () => ({ _tag: "NotProvisioned" }),
    modelRoute: async () => route,
    modelCall: async (call) => {
      calls.push(call);
      return answer(call);
    },
  };
  return { link, calls };
}

async function ask(link: WorkspaceLink | undefined): Promise<AssistantMessage> {
  const brain = workspaceBrain(async () => link);
  const model = brain.models.getModel(brain.model.provider, brain.model.modelId);
  if (model === undefined) throw new Error("The brain's model is not in its catalog");
  return brain.models.complete(model, { messages: [{ role: "user", content: "hello", timestamp: 1 }] });
}

const textOf = (message: AssistantMessage): string => message.content.map((part) => (part.type === "text" ? part.text : "")).join("");

describe("a brain over the workspace's model", () => {
  it("sends the workspace a path and a body, never a credential, and reads the streamed answer", async () => {
    const { link, calls } = workspace(OPENAI);
    const answer = await ask(link);
    expect(textOf(answer)).toBe("Hi there");
    expect(answer.stopReason).toBe("stop");
    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call?.path).toBe("/endpoint_1/v1/chat/completions");
    expect(Object.keys(call?.headers ?? {})).not.toContain("authorization");
    expect(JSON.stringify(call)).not.toContain(SECRET_LOOKING);
    expect(JSON.parse(call?.body ?? "{}")).toMatchObject({ model: "workspace-model", stream: true });
  });

  it("speaks Anthropic's path to an Anthropic connection", async () => {
    const { link, calls } = workspace(
      { ...OPENAI, source: "anthropic", api: "anthropic-messages" },
      () => new Response("{}", { status: 500 }),
    );
    await ask(link);
    expect(calls[0]?.path).toBe("/endpoint_1/v1/messages");
    expect(calls[0]?.headers["anthropic-version"]).toBeDefined();
    expect(Object.keys(calls[0]?.headers ?? {})).not.toContain("x-api-key");
  });

  it("says in words that no model is connected", async () => {
    const reason = "No model is connected. Add a provider key under Settings → Keys.";
    const { link, calls } = workspace({ _tag: "NoModel", reason });
    const answer = await ask(link);
    expect(textOf(answer)).toBe(`I cannot answer yet. ${reason}`);
    expect(answer.stopReason).toBe("stop");
    expect(calls).toEqual([]);
  });

  it("says in words what the provider refused", async () => {
    const { link } = workspace(OPENAI, () => Response.json({ error: { message: "Incorrect API key provided." } }, { status: 401 }));
    const answer = await ask(link);
    expect(answer.stopReason).toBe("stop");
    expect(textOf(answer)).toContain("The model did not answer (Ours)");
    expect(textOf(answer)).toContain("Incorrect API key provided.");
  });

  it("keeps the words it had said when the answer breaks off, and says so", async () => {
    const first = JSON.stringify({
      id: "c",
      object: "chat.completion.chunk",
      created: 0,
      model: "m",
      choices: [{ index: 0, delta: { role: "assistant", content: "The first half" }, finish_reason: null }],
    });
    const { link } = workspace(OPENAI, () => {
      let sent = false;
      const body = new ReadableStream<Uint8Array>({
        pull(controller) {
          if (sent) return controller.error(new Error("The line dropped"));
          sent = true;
          controller.enqueue(new TextEncoder().encode(`data: ${first}\n\n`));
        },
      });
      return new Response(body, { headers: { "content-type": "text/event-stream" } });
    });
    const answer = await ask(link);
    expect(answer.stopReason).toBe("stop");
    expect(textOf(answer)).toContain("The first half");
    expect(textOf(answer)).toContain("The model did not answer (Ours)");
  });

  it("says in words that the workspace did not answer at all", async () => {
    const down = workspace(OPENAI, () => {
      throw new Error("The workspace object is restarting");
    });
    expect(textOf(await ask(down.link))).toContain("The workspace object is restarting");
    expect(textOf(await ask(undefined))).toContain("not set up in a workspace");
  });

  it("is ready when a connection answers, and says why when none does", async () => {
    const brain = workspaceBrain(async () => undefined);
    const ready = workspace(OPENAI).link;
    const none = workspace({ _tag: "NoModel", reason: "No model is connected." }).link;
    expect(await brain.ready?.(ready)).toBeUndefined();
    expect(await brain.ready?.(none)).toEqual({ _tag: "NoModel", reason: "No model is connected." });
  });
});
