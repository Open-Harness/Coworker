import {
  createAssistantMessageEventStream,
  type AssistantMessage,
  type AssistantMessageEventStream,
  type Model,
} from "@earendil-works/pi-ai";
import type { ModelRoute } from "~/modules/models/types.ts";
import type { ModelLink } from "../types.ts";
import { pickOf } from "./provider.ts";

type Routed = Extract<ModelRoute, { readonly _tag: "Route" }>;

const NO_USAGE = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
} as const;

/**
 * What the manager says when it cannot think: an ordinary answer, so the person reads it in the chat. Words it had
 * already said stay, before it; a half-made tool call does not, so nothing half-asked is done.
 */
const saying = (model: Model<string>, text: string, said: AssistantMessage | undefined): AssistantMessage => ({
  role: "assistant",
  content: [...(said?.content.filter((part) => part.type === "text") ?? []), { type: "text", text }],
  api: model.api,
  provider: model.provider,
  model: model.id,
  usage: said?.usage ?? { ...NO_USAGE, cost: { ...NO_USAGE.cost } },
  stopReason: "stop",
  timestamp: Date.now(),
});

function speak(out: AssistantMessageEventStream, model: Model<string>, text: string, said: AssistantMessage | undefined): void {
  const message = saying(model, text, said);
  const contentIndex = message.content.length - 1;
  if (said === undefined) out.push({ type: "start", partial: { ...message, content: [] } });
  out.push({ type: "text_start", contentIndex, partial: message });
  out.push({ type: "text_delta", contentIndex, delta: text, partial: message });
  out.push({ type: "text_end", contentIndex, content: text, partial: message });
  out.push({ type: "done", reason: "stop", message });
}

const reasonOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * One model call, answered by whatever the workspace connects. It asks which connection answers, streams the call
 * through it, and passes the events on. When there is no connection, or the call fails, the manager says so in words:
 * an answer that is text, not an error nobody shows, so the person never waits on a chat that went quiet.
 */
export function relay(
  workspace: () => Promise<ModelLink | undefined>,
  model: Model<string>,
  start: (target: ModelLink, route: Routed) => AssistantMessageEventStream,
): AssistantMessageEventStream {
  const out = createAssistantMessageEventStream();
  void (async () => {
    let said: AssistantMessage | undefined;
    try {
      const target = await workspace();
      if (target === undefined) return speak(out, model, "I have no model to think with: I am not set up in a workspace yet.", said);
      const wanted = pickOf(model.id);
      const route = await (wanted === undefined ? target.modelRoute() : target.modelRoute(wanted));
      if (route._tag === "NoModel") return speak(out, model, `I cannot answer yet. ${route.reason}`, said);
      for await (const event of start(target, route)) {
        if (event.type === "error" && event.reason === "error") {
          return speak(out, model, `The model did not answer (${route.label}): ${event.error.errorMessage ?? "no reason given"}`, said);
        }
        if ("partial" in event) said = event.partial;
        out.push(event);
      }
    } catch (error) {
      speak(out, model, `The model did not answer: ${reasonOf(error)}`, said);
    } finally {
      out.end();
    }
  })();
  return out;
}
