import { type ConversationId, defineDoc, defineDocFamily, type Tx } from "@earendil-works/pi-durable";

export const MAX_DOCUMENTS = 200;
export const MAX_VERSIONS = 20;
export const MAX_CONTENT_CHARACTERS = 150_000;

type StoredDocument = {
  id: string;
  title: string;
  language: string;
  versions: number[];
  chatId: ConversationId;
  updatedAt: number;
};

export const DocumentIndex = defineDoc<{ documents: Record<string, StoredDocument> }>({
  kind: "app.documents",
  version: 1,
  scope: "session",
  initial: () => ({ documents: {} }),
  checkpointWhen: () => true,
});

/** One document per version, so a save never rewrites earlier ones and pruning is one retirement. */
export const VersionContent = defineDocFamily<
  { content: string; title: string; language: string; savedAt: number },
  { content: string; title: string; language: string; savedAt: number }
>({
  family: true,
  kind: "app.document-version",
  version: 1,
  scope: "session",
  initial: (seed) => ({ ...seed }),
  checkpointWhen: () => false,
});

export const versionKey = (documentId: string, version: number): string => `${documentId}:${version}`;

export interface Save {
  readonly documentId: string;
  readonly title: string;
  readonly language: string;
  readonly content: string;
  readonly chatId: ConversationId;
  readonly now: number;
}

/** The one way a document changes: adds a version and drops the oldest beyond the limit. Returns the new version. */
export async function saveVersion(tx: Tx, save: Save): Promise<number> {
  if (save.content.length > MAX_CONTENT_CHARACTERS) {
    throw new Error(`A document holds at most ${MAX_CONTENT_CHARACTERS} characters`);
  }
  const { documents } = await tx.doc(DocumentIndex);
  const existing = documents[save.documentId];
  if (existing === undefined && Object.keys(documents).length >= MAX_DOCUMENTS) {
    throw new Error(`A workspace holds at most ${MAX_DOCUMENTS} documents`);
  }
  const version = (existing?.versions.at(-1) ?? 0) + 1;
  const versions = [...(existing?.versions ?? []), version];
  for (const old of versions.splice(0, Math.max(0, versions.length - MAX_VERSIONS))) {
    await tx.retireDoc(VersionContent, versionKey(save.documentId, old));
  }
  const { title, language, content, now } = save;
  await tx.doc(VersionContent, versionKey(save.documentId, version), { content, title, language, savedAt: now });
  documents[save.documentId] = {
    id: save.documentId,
    title,
    language,
    versions,
    chatId: existing?.chatId ?? save.chatId,
    updatedAt: now,
  };
  return version;
}
