import type { Links } from "~/modules/ui/types.ts";

/** A document opens beside the chat it came from. */
export const links: Links = {
  home: "/",
  library: "/library",
  admin: "/admin",
  workspace: (workspaceId) => `/w/${workspaceId}`,
  settings: (workspaceId) => `/w/${workspaceId}/settings`,
  chat: (workspaceId, chatId) => `/w/${workspaceId}/c/${chatId}`,
  document: (workspaceId, { id, chatId }) => `/w/${workspaceId}/c/${chatId}?doc=${encodeURIComponent(id)}`,
};
