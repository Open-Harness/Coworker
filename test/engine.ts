import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import type { JsonValue } from "@earendil-works/chord/json";
import { fauxAssistantMessage, fauxProvider, fauxToolCall } from "@earendil-works/pi-ai";
import { createModels } from "@earendil-works/pi-ai/models";
import {
  configure,
  type Conversation,
  type ConversationId,
  createRegistry,
  defineExtension,
  Harness,
  type HarnessOptions,
  MemoryStorage,
  ToolResultEntry,
  type ToolRegistration,
} from "@earendil-works/pi-durable";
import { chats } from "~/modules/chats/service.ts";

export const context = BACKGROUND_CONTEXT;
const someone = { id: "guest:1", name: "Amina" };

export interface ToolOutcome {
  readonly text: string;
  readonly isError: boolean;
  readonly details: unknown;
}

/** An engine in memory whose model calls exactly the tools a test asks for. */
export class ToolBench {
  readonly #calls: { readonly name: string; readonly args: { readonly [key: string]: JsonValue } }[] = [];
  #count = 0;
  conversation!: Conversation;

  private constructor(readonly harness: Harness) {}

  static async open(
    tools: readonly ToolRegistration[],
    extra: Partial<Parameters<typeof defineExtension>[0]> = {},
    options: Partial<HarnessOptions> = {},
  ): Promise<ToolBench> {
    const faux = fauxProvider({ provider: "bench", models: [{ id: "caller" }] });
    const models = createModels({ authContext: { env: async () => undefined, fileExists: async () => false } });
    models.setProvider(faux.provider);
    const extension = defineExtension({ name: "bench", tools: [...tools], ...extra });
    const registry = createRegistry();
    registry.install(extension);
    const harness = await Harness.open(
      new MemoryStorage(),
      { models, registry, settings: { extensions: [extension] }, ...options },
      context,
    );
    const bench = new ToolBench(harness);
    const respond: Parameters<typeof faux.setResponses>[0][number] = ({ messages }) => {
      faux.appendResponses([respond]);
      const call = bench.#calls.shift();
      if (messages.at(-1)?.role === "toolResult" || call === undefined) return fauxAssistantMessage("done");
      return fauxAssistantMessage([fauxToolCall(call.name, call.args, { id: `call-${(bench.#count += 1)}` })], { stopReason: "toolUse" });
    };
    faux.setResponses([respond]);
    bench.conversation = await bench.#chat();
    return bench;
  }

  async #chat(): Promise<Conversation> {
    const created = await this.harness.commit((tx) => chats.create(tx, { requestId: "bench", by: someone, now: 1 }), context);
    if (!created.ok) throw new Error(created.message);
    await this.harness.commit((tx) => configure(tx, created.value, { model: { provider: "bench", modelId: "caller" } }), context);
    return this.chat(created.value);
  }

  async chat(id: number): Promise<Conversation> {
    const conversation = await this.harness.conversation(id as ConversationId, context);
    if (conversation === undefined) throw new Error(`No chat ${id}`);
    return conversation;
  }

  async say(content: string): Promise<void> {
    const submission = await this.conversation.submit({ type: "input", content, whenBusy: "followUp" }, context);
    await submission.wait(context);
  }

  async call(name: string, args: { readonly [key: string]: JsonValue }): Promise<ToolOutcome> {
    this.#calls.push({ name, args });
    await this.say(`call ${name}`);
    const entries = await this.harness.commit((tx) => tx.scanEntries({ conversationId: this.conversation.id }, 50), context);
    const result = entries.items.find((entry) => ToolResultEntry.is(entry));
    const message = result?.model?.[0];
    if (message?.role !== "toolResult") throw new Error(`${name} gave no result`);
    const text = message.content.map((part) => (part.type === "text" ? part.text : "")).join("\n");
    return { text, isError: message.isError, details: message.details };
  }

  close(): Promise<void> {
    return this.harness.close(context);
  }
}
