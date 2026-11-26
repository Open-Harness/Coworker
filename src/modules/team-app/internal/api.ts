import { each, isRecord } from "~/modules/team-core/service.ts";
import type { Server } from "~/modules/team-core/types.ts";
import type { TeamApi } from "../types.ts";
import { decodeBoard } from "./decode.ts";
import { decodeItem, decodeItemBody } from "./decode-item.ts";
import { decodeChat, decodePages, decodeSave } from "./decode-manager.ts";

const workspacePath = (workspaceId: string): string => `/api/workspaces/${encodeURIComponent(workspaceId)}`;
const itemPath = (workspaceId: string, itemId: string): string => `${workspacePath(workspaceId)}/inbox/${encodeURIComponent(itemId)}`;
const managerPath = (workspaceId: string, managerId: string): string =>
  `${workspacePath(workspaceId)}/managers/${encodeURIComponent(managerId)}`;

/** The app's API over the line to the server. */
export function createTeamApi({ read, write }: Server): TeamApi {
  return {
    board: (workspaceId, managerId) => read(managerPath(workspaceId, managerId), decodeBoard),
    inbox: (workspaceId) =>
      read(`${workspacePath(workspaceId)}/inbox`, (body) => (isRecord(body) ? each(body["items"], decodeItem) : undefined)),
    item: (workspaceId, itemId) => read(itemPath(workspaceId, itemId), decodeItemBody),
    answer: (workspaceId, itemId, reply) => write("POST", itemPath(workspaceId, itemId), reply, decodeItemBody),
    chat: (workspaceId, managerId) => read(`${managerPath(workspaceId, managerId)}/chat`, decodeChat),
    say: (workspaceId, managerId, text, requestId) =>
      write("POST", `${managerPath(workspaceId, managerId)}/chat`, { text, requestId }, () => true as const),
    pages: (workspaceId, managerId) => read(`${managerPath(workspaceId, managerId)}/pages`, decodePages),
    savePage: (workspaceId, managerId, { page, body, base }, requestId) =>
      write(
        "POST",
        `${managerPath(workspaceId, managerId)}/actions/${page.parent === undefined ? "mission.update" : "page.update"}`,
        { input: page.parent === undefined ? { body, base } : { page: page.id, body, base }, requestId },
        decodeSave,
      ),
  };
}
