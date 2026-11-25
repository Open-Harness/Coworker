import type { TeamLinks } from "../types.ts";

const at = (...parts: readonly string[]): string => `/ws/${parts.map(encodeURIComponent).join("/")}`;

export const teamLinks: TeamLinks = {
  home: "/ws",
  start: "/start",
  step: (workspaceId, step, { managerId, template, only } = {}) => {
    const search = new URLSearchParams({
      ...(managerId === undefined ? {} : { manager: managerId }),
      ...(template === undefined ? {} : { template }),
      ...(only === true ? { only: "1" } : {}),
    }).toString();
    return `/start/${encodeURIComponent(workspaceId)}/${step}${search === "" ? "" : `?${search}`}`;
  },
  workspace: (workspaceId) => at(workspaceId),
  inbox: (workspaceId) => at(workspaceId, "inbox"),
  item: (workspaceId, itemId) => at(workspaceId, "inbox", itemId),
  people: (workspaceId) => at(workspaceId, "people"),
  environments: (workspaceId) => at(workspaceId, "environments"),
  settings: (workspaceId, page) => at(workspaceId, "settings", page),
  board: (workspaceId, managerId) => at(workspaceId, "m", managerId),
  chat: (workspaceId, managerId) => at(workspaceId, "m", managerId, "chat"),
  overview: (workspaceId, managerId) => at(workspaceId, "m", managerId, "overview"),
  mission: (workspaceId, managerId, pageId) =>
    pageId === undefined
      ? at(workspaceId, "m", managerId, "mission")
      : `${at(workspaceId, "m", managerId, "mission")}?page=${encodeURIComponent(pageId)}`,
  managerSettings: (workspaceId, managerId, section = "sources", source) =>
    `${at(workspaceId, "m", managerId, "settings", section)}${source === undefined ? "" : `?source=${encodeURIComponent(source)}`}`,
  events: (workspaceId, managerId) => at(workspaceId, "m", managerId, "events"),
  task: (workspaceId, managerId, taskId) => at(workspaceId, "m", managerId, "tasks", taskId),
  run: (workspaceId, managerId, runId) => at(workspaceId, "m", managerId, "runs", runId),
  build: (workspaceId, page, itemId) =>
    `${at(workspaceId, "build", page)}${itemId === undefined ? "" : `?item=${encodeURIComponent(itemId)}`}`,
};
