import type { Ids } from "./access-table.ts";

/*
 * One page of every kind that loads something, with the request that feeds it. The page is opened while that request
 * fails, must say it did not load and offer "Try again", and must show its content after the request works again.
 */

export interface Failing {
  readonly name: string;
  readonly address: (ids: Ids) => string;
  /** The path (under /api) of the request to break. A string matches the path exactly; a pattern matches any part of it. */
  readonly breaks: (ids: Ids) => string | RegExp;
  /** How the request fails: the server answering 500, or the connection dropping. */
  readonly how: "500" | "drop";
  /** What shows once it loaded. */
  readonly shows: string;
  /** The words the page says when it did not load. */
  readonly says: RegExp;
}

const ws = (i: Ids): string => `/ws/${i.workspace}`;
const api = (i: Ids, path = ""): string => `/api/workspaces/${i.workspace}${path}`;

export const FAILING: readonly Failing[] = [
  {
    name: "Your workspaces",
    address: () => "/ws",
    breaks: () => "/api/workspaces",
    how: "drop",
    shows: "Your workspaces",
    says: /Your workspaces did not load/u,
  },
  {
    name: "Home",
    address: ws,
    breaks: (i) => api(i, "/home"),
    how: "500",
    shows: "Tasks created and finished",
    says: /Home did not load/u,
  },
  {
    name: "Overview",
    address: (i) => `${ws(i)}/m/${i.manager}/overview`,
    breaks: (i) => api(i, `/managers/${i.manager}/overview`),
    how: "drop",
    shows: "Launch",
    says: /The overview did not load/u,
  },
  {
    name: "Inbox",
    address: (i) => `${ws(i)}/inbox`,
    breaks: (i) => api(i, "/inbox"),
    how: "500",
    shows: "Inbox",
    says: /The Inbox did not load/u,
  },
  {
    name: "Your access",
    address: (i) => `${ws(i)}/inbox`,
    breaks: (i) => api(i, "/access"),
    how: "500",
    shows: "Inbox",
    says: /Your access did not load/u,
  },
  {
    name: "Board",
    address: (i) => `${ws(i)}/m/${i.manager}`,
    breaks: (i) => api(i, `/managers/${i.manager}`),
    how: "drop",
    shows: "Board",
    says: /The board did not load/u,
  },
  {
    name: "Chat",
    address: (i) => `${ws(i)}/m/${i.manager}/chat`,
    breaks: (i) => api(i, `/managers/${i.manager}/chat`),
    how: "500",
    shows: "Chat",
    says: /The chat did not load/u,
  },
  {
    name: "Mission",
    address: (i) => `${ws(i)}/m/${i.manager}/mission`,
    breaks: (i) => api(i, `/managers/${i.manager}/pages`),
    how: "500",
    shows: "Mission",
    says: /The mission did not load/u,
  },
  {
    name: "Events",
    address: (i) => `${ws(i)}/m/${i.manager}/events`,
    breaks: (i) => api(i, `/managers/${i.manager}/events`),
    how: "drop",
    shows: "Events",
    says: /Events did not load/u,
  },
  {
    name: "A task",
    address: (i) => `${ws(i)}/m/${i.manager}/tasks/DT-1`,
    breaks: (i) => api(i, `/managers/${i.manager}/tasks/DT-1`),
    how: "500",
    shows: "Write the v2.3 changelog",
    says: /The task did not load/u,
  },
  {
    name: "A run",
    address: (i) => `${ws(i)}/m/${i.manager}/runs/run-1`,
    breaks: (i) => api(i, `/managers/${i.manager}/runs/run-1`),
    how: "drop",
    shows: "Report",
    says: /The run did not load/u,
  },
  {
    name: "Manager settings: Sources",
    address: (i) => `${ws(i)}/m/${i.manager}/settings/sources`,
    breaks: (i) => api(i, `/managers/${i.manager}`),
    how: "500",
    shows: "Where this manager listens",
    says: /The sources did not load/u,
  },
  {
    name: "Manager settings: Who may ask",
    address: (i) => `${ws(i)}/m/${i.manager}/settings/who-may-ask`,
    breaks: (i) => api(i, `/managers/${i.manager}/policy`),
    how: "500",
    shows: "Who may ask",
    says: /Who may ask did not load/u,
  },
  {
    name: "Manager settings: Permissions",
    address: (i) => `${ws(i)}/m/${i.manager}/settings/permissions`,
    breaks: (i) => api(i, `/managers/${i.manager}/permissions`),
    how: "drop",
    shows: "Settings",
    says: /Permissions did not load/u,
  },
  {
    name: "Agents",
    address: (i) => `${ws(i)}/build/agents`,
    breaks: (i) => api(i, "/agents"),
    how: "500",
    shows: "Agents",
    says: /Agents did not load/u,
  },
  {
    name: "Skills",
    address: (i) => `${ws(i)}/build/skills`,
    breaks: (i) => api(i, "/skills"),
    how: "drop",
    shows: "Skills",
    says: /Skills did not load/u,
  },
  {
    name: "Templates",
    address: (i) => `${ws(i)}/build/templates`,
    breaks: (i) => api(i, "/templates"),
    how: "500",
    shows: "Templates",
    says: /Templates did not load/u,
  },
  {
    name: "Environments",
    address: (i) => `${ws(i)}/environments`,
    breaks: (i) => api(i, "/environments"),
    how: "drop",
    shows: "Secrets",
    says: /Environments did not load/u,
  },
  {
    name: "People",
    address: (i) => `${ws(i)}/people`,
    breaks: (i) => api(i, "/people"),
    how: "500",
    shows: "People",
    says: /People did not load/u,
  },
  {
    name: "Profile",
    address: (i) => `${ws(i)}/settings/profile`,
    breaks: (i) => api(i, "/me"),
    how: "500",
    shows: "Linked accounts",
    says: /did not load/u,
  },
  {
    name: "General",
    address: (i) => `${ws(i)}/settings/general`,
    breaks: (i) => api(i, "/general"),
    how: "drop",
    shows: "Danger zone",
    says: /General did not load/u,
  },
  {
    name: "Members",
    address: (i) => `${ws(i)}/settings/members`,
    breaks: () => /\/api\/auth\/organization\/list-members/u,
    how: "500",
    shows: "Members",
    says: /Members did not load/u,
  },
  {
    name: "Roles and permissions",
    address: (i) => `${ws(i)}/settings/roles`,
    breaks: (i) => api(i, "/roles"),
    how: "500",
    shows: "Roles and permissions",
    says: /Roles did not load/u,
  },
  {
    name: "Keys and connections",
    address: (i) => `${ws(i)}/settings/keys`,
    breaks: (i) => api(i, "/models"),
    how: "drop",
    shows: "Models",
    says: /Keys did not load/u,
  },
  {
    name: "Usage",
    address: (i) => `${ws(i)}/settings/usage`,
    breaks: (i) => api(i, "/usage"),
    how: "500",
    shows: "Usage",
    says: /Usage did not load/u,
  },
  {
    name: "Billing",
    address: (i) => `${ws(i)}/settings/billing`,
    breaks: (i) => api(i, "/billing"),
    how: "drop",
    shows: "Plan",
    says: /Billing did not load/u,
  },
  {
    name: "Security",
    address: (i) => `${ws(i)}/settings/security`,
    breaks: (i) => api(i, "/join"),
    how: "500",
    shows: "Security",
    says: /Security did not load/u,
  },
  {
    name: "Audit log",
    address: (i) => `${ws(i)}/settings/audit`,
    breaks: (i) => api(i, "/audit"),
    how: "500",
    shows: "Audit log",
    says: /did not load/u,
  },
];
