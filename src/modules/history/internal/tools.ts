import { AssistantEntry, configure, type ConversationId, defineExtension, type ToolRegistration } from "@earendil-works/pi-durable";
import { obj, str } from "@earendil-works/pi-schema";
import { messageText } from "~/modules/transcript/service.ts";
import { SEARCH_HISTORY, searchHistory } from "./search.ts";

const searchMessagesTool: ToolRegistration = {
  name: "search_messages",
  description: "Find messages containing a word or phrase in this workspace's chats. Returns at most 20 snippets.",
  parameters: obj({ term: str({ minLength: 1, maxLength: 200 }) }),
  replay: "safe",
  execute: async ({ term }: { term: string }, api, context) => ({
    output: [{ type: "text", text: JSON.stringify(await searchHistory(api, term, context)) }],
  }),
};

/** Selected only by the search subagent. */
export const searchExtension = defineExtension({ name: "history-search", tools: [searchMessagesTool] });

/** Delegates to a child conversation owned by this call; the chat receives its answer, not the raw matches. */
export const searchHistoryTool: ToolRegistration = {
  name: SEARCH_HISTORY,
  description:
    "Answer a question about earlier discussions in this workspace. A helper searches the chats and replies briefly, citing chat ids.",
  parameters: obj({ question: str({ minLength: 1, maxLength: 2_000 }) }),
  replay: "safe",
  execute: async ({ question }: { question: string }, api, context) => {
    const childId: ConversationId = await api.commit(async (tx) => {
      // Ownership is the durable record of the child, so a rerun reuses it instead of creating another.
      const existing = (await tx.scanConversations({ ownerTaskId: api.taskId }, 1)).items[0];
      if (existing !== undefined) return existing.id;
      const child = await tx.createConversation({ ownership: { kind: "task", taskId: api.taskId } });
      await configure(tx, child.id, { extensions: [searchExtension], tools: [searchMessagesTool] });
      return child.id;
    }, context);
    await api.details({ conversationId: childId }, context);
    const child = await api.conversation(childId, context);
    if (child === undefined) throw new Error(`Search conversation ${childId} is missing`);
    const submission = await child.submit(
      {
        type: "input",
        content: `Answer this question using search_messages: ${question}\n\nTry a few relevant terms. Reply briefly, cite chat ids, and say so when nothing relevant was found.`,
        requestId: `search-history:${api.taskId}`,
      },
      context,
    );
    const settled = await submission.wait(context);
    if (settled.status !== "done" || settled.type !== "input") {
      throw new Error(`The history search did not answer: ${settled.status}`);
    }
    const answer = await api.commit((tx) => tx.entry(AssistantEntry, settled.answer), context);
    return {
      output: [{ type: "text", text: messageText(answer?.model?.[0]) }],
      details: { conversationId: childId },
    };
  },
};
