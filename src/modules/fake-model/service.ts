import { nextStep } from "./internal/script.ts";
import { completion, readChat, streamed } from "./internal/wire.ts";
import { MODELS, type FakeModel } from "./types.ts";

const problem = (status: number, message: string, code: string): Response =>
  Response.json({ error: { message, type: "invalid_request_error", code } }, { status });

export const fakeModel: FakeModel = {
  handle: async (request, { key }) => {
    const { pathname } = new URL(request.url);
    if (key !== undefined && key !== "" && request.headers.get("authorization") !== `Bearer ${key}`) {
      return problem(401, "Incorrect API key provided.", "invalid_api_key");
    }
    if (pathname === "/v1/models" && request.method === "GET") {
      return Response.json({ object: "list", data: MODELS.map((id) => ({ id, object: "model", owned_by: "coworker-fake-model" })) });
    }
    if (pathname !== "/v1/chat/completions" || request.method !== "POST") return problem(404, "Not found", "not_found");
    const chat = readChat(await request.json().catch(() => undefined));
    if (chat === undefined) return problem(400, "A chat request has a list of messages.", "invalid_request");
    const step = nextStep(chat.turns, chat.tools);
    return chat.stream ? streamed(chat.model, step) : completion(chat.model, step);
  },
};
