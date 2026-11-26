import { fauxAssistantMessage, fauxProvider, type FauxResponseFactory, fauxText, fauxToolCall } from "@earendil-works/pi-ai";
import type { Provider } from "@earendil-works/pi-ai/models";

/*
 * A scripted model. It needs no key, streams slowly enough to watch, and reacts to a few words so that every feature
 * of the page can be exercised end to end: "document (again)", "schedule", "search", "fetch <url>", "slow", "fail". It also drafts agents.
 */

const TOKENS_PER_SECOND = 40;
const QUEUE_LOW = 50;

type Messages = Parameters<FauxResponseFactory>[0]["messages"];

const partsText = (content: unknown): string =>
  typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content
          .map((part: unknown) =>
            typeof part === "object" && part !== null && "text" in part && typeof part.text === "string" ? part.text : "",
          )
          .join("\n")
      : "";

const DOCUMENT = [
  "# Release plan",
  "",
  "1. Freeze on Thursday.",
  "2. Ship to the staging node.",
  "3. Watch it for a day, then promote.",
  "",
  "| Step | Owner |",
  "| --- | --- |",
  "| Freeze | Platform |",
  "| Promote | Everyone |",
].join("\n");

const CODE = ["```ts", "const greet = (name: string) => `Hello, ${name}`;", 'greet("team");', "```"].join("\n");

/** The document the conversation is about, as the last receipt names it. */
const documentIn = (messages: Messages): string | undefined =>
  messages.flatMap((message) => /\(documentId ([^)]+)\)/u.exec(partsText(message.content))?.[1] ?? []).at(-1);

function toolCallFor(prompt: string, seed: string, messages: Messages) {
  const id = (name: string) => ({ id: `${name}-${seed}` });
  if (/\bdocument\b/iu.test(prompt)) {
    const documentId = /\bagain\b/iu.test(prompt) ? documentIn(messages) : undefined;
    const args = { title: "Release plan", content: DOCUMENT, ...(documentId === undefined ? {} : { documentId }) };
    return fauxToolCall("write_document", args, id("document"));
  }
  if (/\bschedule\b/iu.test(prompt)) {
    return fauxToolCall("schedule", { instruction: "Say that the time has come", delaySeconds: 3 }, id("schedule"));
  }
  if (/\bsearch\b/iu.test(prompt)) {
    return fauxToolCall("search_history", { question: "What did we decide?" }, id("search"));
  }
  const url = /\bfetch (\S+)/iu.exec(prompt)?.[1];
  return url === undefined ? undefined : fauxToolCall("web_fetch", { url }, id("fetch"));
}

function answerTo(messages: Messages): ReturnType<typeof fauxAssistantMessage> {
  const last = messages.at(-1);
  if (last?.role === "toolResult") {
    return fauxAssistantMessage(
      last.isError ? `That did not work: ${partsText(last.content).slice(0, 200)}` : `Done with ${last.toolName}.`,
    );
  }
  const wanted = /^Describe your agent: (.*)/su.exec(partsText(last?.content))?.[1];
  if (wanted !== undefined) {
    return fauxAssistantMessage(
      JSON.stringify({ name: "Drafted agent", description: wanted.slice(0, 100), system: `You do this: ${wanted}`, tools: ["web"] }),
    );
  }
  const prompt = partsText(messages.findLast(({ role }) => role === "user")?.content);
  if (/\bfail\b/iu.test(prompt)) {
    return fauxAssistantMessage("", { stopReason: "error", errorMessage: "The scripted model was told to fail" });
  }
  const call = toolCallFor(prompt, String(messages.length), messages);
  if (call !== undefined) return fauxAssistantMessage([fauxText("Let me do that."), call], { stopReason: "toolUse" });
  if (/\bslow\b/iu.test(prompt)) return fauxAssistantMessage(`Taking my time. ${"One step after another. ".repeat(60)}`);
  if (/\bcode\b/iu.test(prompt)) return fauxAssistantMessage(`Here is a small example:\n\n${CODE}`);
  return fauxAssistantMessage(`You said: ${prompt.replace(/^\[[^\]]*\]\n/u, "")}`);
}

export function fakeProvider(): Provider {
  const faux = fauxProvider({
    provider: "fake",
    models: [
      { id: "scripted", name: "Scripted (no key)", cost: { input: 1, output: 2, cacheRead: 0, cacheWrite: 0 } },
      { id: "scripted-thinker", name: "Scripted thinker", reasoning: true },
    ],
    tokensPerSecond: TOKENS_PER_SECOND,
  });
  // The provider answers from a queue; each answer refills it, so it never runs dry.
  const respond: FauxResponseFactory = (context) => {
    if (faux.getPendingResponseCount() < QUEUE_LOW) faux.appendResponses([respond]);
    return answerTo(context.messages);
  };
  faux.setResponses(Array.from({ length: QUEUE_LOW }, () => respond));
  return faux.provider;
}
