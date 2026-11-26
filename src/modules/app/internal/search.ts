import { useCallback } from "react";
import type { WorkspaceRow } from "~/modules/protocol/types.ts";
import { withoutAttribution } from "~/modules/transcript/service.ts";
import type { SearchEntry } from "~/modules/ui/types.ts";
import { links } from "./links.ts";
import { useSession } from "./page-context.ts";

const RECENT = 8;
const matches = (text: string, term: string): boolean => text.toLowerCase().includes(term.toLowerCase());

const chatEntries = (workspaces: readonly WorkspaceRow[]): (SearchEntry & { readonly at: number })[] =>
  workspaces.flatMap((workspace) =>
    workspace.chats.map(({ id, title, updatedAt }) => ({
      id: links.chat(workspace.id, id),
      label: title,
      description: workspace.name,
      kind: "chat" as const,
      at: updatedAt,
    })),
  );

const documentEntries = (workspaces: readonly WorkspaceRow[]): SearchEntry[] =>
  workspaces.flatMap((workspace) =>
    workspace.documents.map((document) => ({
      id: links.document(workspace.id, document),
      label: document.title,
      description: workspace.name,
      kind: "document" as const,
    })),
  );

/** Chats and documents everywhere by title, and messages in the workspace on screen. Entries are named by address. */
export function useSearch() {
  const { directory, workspaces } = useSession();
  const recent = useCallback(
    (): readonly SearchEntry[] =>
      chatEntries(directory.state.get().workspaces)
        .toSorted((left, right) => right.at - left.at)
        .slice(0, RECENT),
    [directory],
  );
  const search = useCallback(
    async (term: string): Promise<readonly SearchEntry[]> => {
      const rows = directory.state.get().workspaces;
      const titled = [...chatEntries(rows), ...documentEntries(rows)].filter(({ label }) => matches(label, term));
      const client = workspaces.current.get();
      const found = client === undefined ? undefined : await client.search(term);
      if (client === undefined || found?.ok !== true) return titled;
      const chats = rows.find(({ id }) => id === client.id)?.chats ?? [];
      const messages = found.value.matches.map(({ chatId, entryId, snippet }): SearchEntry => ({
        id: `${links.chat(client.id, chatId)}#message-${entryId}`,
        label: withoutAttribution(snippet),
        description: chats.find(({ id }) => id === chatId)?.title ?? "Chat",
        kind: "message",
      }));
      return [...titled, ...messages];
    },
    [directory, workspaces],
  );
  return { recent, search };
}
