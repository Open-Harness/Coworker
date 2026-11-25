import type { Context } from "@earendil-works/chord/context";
import { defineDoc, type ToolExecutionApi, type ToolRegistration, type Tx } from "@earendil-works/pi-durable";
import { obj, opt, str } from "@earendil-works/pi-schema";
import { DocumentIndex, saveVersion, VersionContent, versionKey } from "./store.ts";

type Receipt = { documentId: string; version: number; title: string };

/** What a tool call saved, so replaying the call after a crash does not save a second version. */
const SaveReceipt = defineDoc<{ receipt?: Receipt }>({
  kind: "app.document-save",
  version: 1,
  scope: "task",
  initial: () => ({}),
  checkpointWhen: () => false,
});

async function saveOnce(api: ToolExecutionApi, save: (tx: Tx) => Promise<Receipt>, context: Context): Promise<Receipt> {
  return api.commit(async (tx) => {
    const doc = await tx.doc(SaveReceipt, api.taskId);
    if (doc.receipt !== undefined) return { ...doc.receipt };
    const receipt = await save(tx);
    doc.receipt = receipt;
    return receipt;
  }, context);
}

const saved = (receipt: Receipt) => ({
  output: [
    {
      type: "text" as const,
      text: `Saved "${receipt.title}" as version ${receipt.version} (documentId ${receipt.documentId}). People open it from the chat; do not repeat its content.`,
    },
  ],
  details: receipt,
});

type WriteArguments = { documentId?: string; title: string; language?: string; content: string };

export const writeDocumentTool: ToolRegistration = {
  name: "write_document",
  description:
    "Write a document people keep and reread: a report, plan, table or source file. Creates one, or replaces the content of an existing one as a new version. Use it instead of a long answer.",
  parameters: obj({
    documentId: opt(str({ description: "The document to replace. Omit to create one" })),
    title: str({ minLength: 1, maxLength: 120 }),
    language: opt(str({ maxLength: 32, description: "markdown (default), or a code language such as typescript" })),
    content: str({ minLength: 1 }),
  }),
  replay: "safe",
  execute: async (args: WriteArguments, api, context) =>
    saved(
      await saveOnce(
        api,
        async (tx) => {
          const documentId = args.documentId ?? `doc-${api.taskId}`;
          if (args.documentId !== undefined) await requireDocument(tx, documentId);
          const version = await saveVersion(tx, {
            documentId,
            title: args.title,
            language: args.language ?? "markdown",
            content: args.content,
            chatId: api.conversationId,
            now: api.now(),
          });
          return { documentId, version, title: args.title };
        },
        context,
      ),
    ),
};

type EditArguments = { documentId: string; find: string; replace: string };

export const editDocumentTool: ToolRegistration = {
  name: "edit_document",
  description: "Change part of a document: replaces one exact, unique passage and saves a new version.",
  parameters: obj({
    documentId: str(),
    find: str({ minLength: 1, description: "The exact passage to replace. It must occur once" }),
    replace: str(),
  }),
  replay: "safe",
  execute: async (args: EditArguments, api, context) =>
    saved(
      await saveOnce(
        api,
        async (tx) => {
          const { title, language, content } = await latest(tx, args.documentId);
          const parts = content.split(args.find);
          if (parts.length !== 2) {
            throw new Error(parts.length === 1 ? "The passage was not found" : "The passage occurs more than once");
          }
          const version = await saveVersion(tx, {
            documentId: args.documentId,
            title,
            language,
            content: parts.join(args.replace),
            chatId: api.conversationId,
            now: api.now(),
          });
          return { documentId: args.documentId, version, title };
        },
        context,
      ),
    ),
};

async function requireDocument(tx: Tx, documentId: string) {
  const { documents } = await tx.doc(DocumentIndex);
  const found = documents[documentId];
  if (found === undefined) throw new Error(`Document ${documentId} does not exist`);
  return found;
}

async function latest(tx: Tx, documentId: string) {
  const { versions, title, language } = await requireDocument(tx, documentId);
  const key = versionKey(documentId, versions.at(-1)!);
  return tx.doc(VersionContent, key, { content: "", title, language, savedAt: 0 });
}

export const readDocumentTool: ToolRegistration = {
  name: "read_document",
  description: "Read a document of this workspace. Without documentId, lists the documents there are.",
  parameters: obj({ documentId: opt(str()) }),
  replay: "safe",
  execute: async ({ documentId }: { documentId?: string }, api, context) => {
    const text =
      documentId === undefined
        ? JSON.stringify(
            Object.values((await api.snapshot(DocumentIndex, context))?.documents ?? {}).map(({ id, title, language }) => ({
              documentId: id,
              title,
              language,
            })),
          )
        : await api.commit(async (tx) => (await latest(tx, documentId)).content, context);
    return { output: [{ type: "text", text }] };
  },
};
