import { useCallback, useState } from "react";
import { Load, teamLinks, useBrowser, useLoading } from "~/modules/team-core/service.ts";
import type { ChatLineData } from "../types.ts";
import { ChatScreen } from "./ChatScreen.tsx";
import { useMe, useTeamApi } from "./context.ts";

/** How often an open chat asks for new lines, and so how fast an answer being written grows on the page. */
const REFRESH_MS = 600;
/** How often it asks what waits in the Inbox. */
const INBOX_MS = 1_500;

/** A manager's chat, kept fresh while it is open. What was just said shows at once, until the server has it. */
export function ChatPage({ workspaceId, managerId }: { readonly workspaceId: string; readonly managerId: string }) {
  const api = useTeamApi();
  const me = useMe();
  const { newId } = useBrowser();
  const [sending, setSending] = useState<readonly (ChatLineData & { readonly after: number })[]>([]);
  const [failure, setFailure] = useState<string>();
  const { loaded: board } = useLoading(useCallback(() => api.board(workspaceId, managerId), [api, workspaceId, managerId]));
  const { loaded, reload } = useLoading(
    useCallback(() => api.chat(workspaceId, managerId), [api, workspaceId, managerId]),
    REFRESH_MS,
  );
  const { loaded: inbox } = useLoading(
    useCallback(() => api.inbox(workspaceId), [api, workspaceId]),
    INBOX_MS,
  );
  const asked =
    inbox?._tag === "Loaded"
      ? inbox.value.filter((item) => item.managerId === managerId && item.kind === "question" && item.answer === undefined)
      : [];
  const lines = loaded?._tag === "Loaded" ? loaded.value : [];
  // The answer being written has no place of its own in the order: it is not counted, so what was said before it stays put.
  const settled = lines.filter((line) => line.streaming !== true);
  const unseen = sending.filter(({ text, after }) => !settled.slice(after).some((line) => line.role === "person" && line.text === text));
  const onSay = (text: string) => {
    const id = newId();
    setSending((all) => [...all, { id, role: "person", authorName: me, text, after: settled.length }]);
    void api.say(workspaceId, managerId, text, id).then((sent) => {
      setFailure(sent._tag === "Failed" ? sent.message : undefined);
      if (sent._tag === "Failed") setSending((all) => all.filter((line) => line.id !== id));
      reload();
    });
  };
  return (
    <Load loaded={board} failedTitle="The chat did not load">
      {({ managerName, address, model }) => (
        <Load loaded={loaded} failedTitle="The chat did not load">
          {() => (
            <ChatScreen
              managerName={managerName}
              address={address}
              lines={[...settled, ...unseen, ...lines.filter((line) => line.streaming === true)]}
              {...(model === undefined || model.ready
                ? {}
                : { noModel: { reason: model.reason, ...(model.canFix ? { fixHref: teamLinks.settings(workspaceId, "keys") } : {}) } })}
              onSay={onSay}
              questions={{ workspaceId, items: asked }}
              {...(failure === undefined ? {} : { failure })}
            />
          )}
        </Load>
      )}
    </Load>
  );
}
