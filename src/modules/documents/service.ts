import { DocumentIndex, VersionContent, versionKey } from "./internal/store.ts";
import { editDocumentTool, readDocumentTool, writeDocumentTool } from "./internal/tools.ts";
import type { Documents } from "./types.ts";

export { DocumentIndex } from "./internal/store.ts";
export const documentTools = [writeDocumentTool, editDocumentTool, readDocumentTool] as const;

export const documents: Documents = {
  async list(harness, context) {
    const index = await harness.snapshot(DocumentIndex, context);
    return Object.values(index?.documents ?? {})
      .map(({ id, title, language, versions, chatId, updatedAt }) => ({
        id,
        title,
        language,
        version: versions.at(-1) ?? 0,
        versions: [...versions],
        chatId,
        updatedAt,
      }))
      .sort((left, right) => right.updatedAt - left.updatedAt);
  },
  async read(harness, documentId, version, context) {
    const index = await harness.snapshot(DocumentIndex, context);
    const wanted = version ?? index?.documents[documentId]?.versions.at(-1);
    if (wanted === undefined) return undefined;
    const stored = await harness.snapshot(VersionContent, versionKey(documentId, wanted), context);
    return stored === undefined ? undefined : { documentId, version: wanted, ...stored };
  },
};
