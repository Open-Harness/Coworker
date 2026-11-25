import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "@tanstack/react-store";
import { useToast } from "@astryxdesign/core/Toast";
import type { Answer, Source } from "~/modules/directory-client/types.ts";
import type { DocumentVersion } from "~/modules/protocol/types.ts";
import type { WorkspaceClient, WorkspacePage } from "~/modules/manager-client/types.ts";
import { useSession } from "./page-context.ts";

/** Waits for an answer and shows a refusal. Returns the value, if any. */
export function useReport() {
  const showToast = useToast();
  return useCallback(
    async <T>(asking: Promise<Answer<T>>): Promise<T | undefined> => {
      const answer = await asking;
      if (answer.ok) return answer.value;
      showToast({ body: answer.error.message, type: "error", uniqueID: answer.error.message });
      return undefined;
    },
    [showToast],
  );
}

export const useDirectory = () => useSelector(useSession().directory.state);

/** The connected workspace, if it is the one asked for. */
export function useWorkspace(workspaceId: string | undefined): WorkspaceClient | undefined {
  const { workspaces } = useSession();
  const current = useSelector(workspaces.current);
  useEffect(() => {
    if (workspaceId !== undefined) workspaces.select(workspaceId);
  }, [workspaces, workspaceId]);
  return current?.id === workspaceId ? current : undefined;
}

const noPage: WorkspacePage = { status: "connected", models: [], chats: {}, closed: [] };
const noState: Source<WorkspacePage> = { get: () => noPage, subscribe: () => ({ unsubscribe: () => {} }) };

/** Something of a workspace's state, also while there is no workspace. */
export const useWorkspaceState = <T>(client: WorkspaceClient | undefined, select: (state: WorkspacePage) => T): T =>
  useSelector(client?.state ?? noState, select);

const TYPING_MS = 4_000;

/** Tells others about typing, until a pause. */
export function useTyping(client: WorkspaceClient, chatId: number): (text: string) => void {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), [client, chatId]);
  return (text) => {
    clearTimeout(timer.current);
    client.setTyping(chatId, text !== "");
    if (text !== "") timer.current = setTimeout(() => client.setTyping(chatId, false), TYPING_MS);
  };
}

/** Unsent text of a chat, kept while the page is open. */
export function useDraft(key: string): readonly [string, (text: string) => void] {
  const { drafts } = useSession();
  const [draft, setDraft] = useState(drafts.get(key) ?? "");
  const change = (text: string) => {
    drafts.set(key, text);
    setDraft(text);
  };
  return [draft, change];
}

export interface LoadedDocument {
  readonly document?: DocumentVersion;
  readonly problem?: string;
}

/** A document's content. `newest` changes when someone saves another version. */
export function useDocument(client: WorkspaceClient, documentId: string, version: number | undefined, newest: number): LoadedDocument {
  const [loaded, setLoaded] = useState<LoadedDocument>({});
  const status = useSelector(client.state, (state) => state.status);
  useEffect(() => {
    if (status !== "connected") return;
    let isCurrent = true;
    void client.readDocument(documentId, version).then((answer) => {
      if (isCurrent) setLoaded(answer.ok ? { document: answer.value } : { problem: answer.error.message });
    });
    return () => {
      isCurrent = false;
    };
  }, [client, documentId, version, newest, status]);
  return loaded;
}
