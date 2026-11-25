import { createFileRoute } from "@tanstack/react-router";
import { ChatScreen } from "~/modules/app/service.ts";
import type { DocumentSearch } from "~/modules/app/types.ts";

function Chat() {
  const { workspaceId, chatId } = Route.useParams();
  return <ChatScreen workspaceId={workspaceId} chatId={Number(chatId)} search={Route.useSearch()} />;
}

export const Route = createFileRoute("/_app/_chat/w/$workspaceId/c/$chatId")({
  validateSearch: ({ doc, v }: Record<string, unknown>): DocumentSearch => ({
    ...(typeof doc === "string" ? { doc } : {}),
    ...(Number.isInteger(Number(v)) && v !== undefined ? { v: Number(v) } : {}),
  }),
  component: Chat,
});
