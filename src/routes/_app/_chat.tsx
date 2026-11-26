import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { Shell } from "~/modules/app/service.ts";
import type { Selected } from "~/modules/ui/types.ts";

function useSelected(): Selected {
  const matches = useMatches();
  const { workspaceId, chatId } = Object.assign({}, ...matches.map(({ params }) => params)) as Record<string, string>;
  const address = matches.at(-1)?.fullPath ?? "";
  const page = address.endsWith("/settings") ? "settings" : address === "/library" ? "library" : chatId ? "chat" : "home";
  return {
    page,
    ...(workspaceId === undefined ? {} : { workspaceId }),
    ...(chatId === undefined ? {} : { chatId: Number(chatId) }),
  };
}

function People() {
  return (
    <Shell selected={useSelected()}>
      <Outlet />
    </Shell>
  );
}

/** What everyone sees: chats, documents, and the settings of a workspace. */
export const Route = createFileRoute("/_app/_chat")({ component: People });
