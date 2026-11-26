import type { Who } from "./access-people.ts";

/*
 * Every page under /ws/<workspace>, and who may open it. Written by hand from docs/old/model.md and docs/old/actions.md, not
 * from the app's own table, so that a mistake in one cannot hide behind the same mistake in the other:
 *
 * - Everyone reads Home, the Inbox, Chat, the Overview, the Board, tasks, runs, People, Agents, Skills and Templates, and has a Profile and
 *   Notifications. A Member reads Agents and Skills and a manager's Settings, and cannot change them: the server says no.
 * - Reading the mission, the events and a manager's Settings (its Policy and Permissions) are catalogue actions too:
 *   an Owner can take them from anyone, a Builder included.
 * - Environments hold the vault's secret names: Owners and Builders.
 * - Making a manager needs `manager.create`: Builders have it, a Member can be given it.
 * - The workspace's eight settings pages are the Owner's.
 */

export interface Ids {
  readonly workspace: string;
  readonly manager: string;
}

export interface Row {
  readonly name: string;
  readonly address: (ids: Ids) => string;
  /** What the page reads, as `GET` paths under /api/workspaces/<workspace>. The server refuses these to whoever may not open it. */
  readonly data: (ids: Ids) => readonly string[];
  /** The page's own first heading, when it opens. */
  readonly heading: string;
  readonly open: readonly Who[];
}

const ALL: readonly Who[] = ["owner", "builder", "member", "granted", "narrowed"];
const OWNER: readonly Who[] = ["owner"];
const BUILDERS: readonly Who[] = ["owner", "builder", "narrowed"];
/** Everyone but the Builder an Owner took three reads from. */
const NOT_NARROWED: readonly Who[] = ["owner", "builder", "member", "granted"];
const mgr = (ids: Ids): string => `/managers/${ids.manager}`;

export const PAGES: readonly Row[] = [
  { name: "Home", address: (i) => `/ws/${i.workspace}`, data: () => ["/home"], heading: "Home", open: ALL },
  {
    name: "Overview",
    address: (i) => `/ws/${i.workspace}/m/${i.manager}/overview`,
    data: (i) => [`${mgr(i)}/overview`],
    heading: "Launch",
    open: ALL,
  },
  { name: "Inbox", address: (i) => `/ws/${i.workspace}/inbox`, data: () => ["/inbox"], heading: "Inbox", open: ALL },
  { name: "Board", address: (i) => `/ws/${i.workspace}/m/${i.manager}`, data: (i) => [mgr(i)], heading: "Board", open: ALL },
  { name: "Chat", address: (i) => `/ws/${i.workspace}/m/${i.manager}/chat`, data: (i) => [`${mgr(i)}/chat`], heading: "Chat", open: ALL },
  {
    name: "Mission",
    address: (i) => `/ws/${i.workspace}/m/${i.manager}/mission`,
    data: (i) => [`${mgr(i)}/pages`],
    heading: "Mission",
    open: NOT_NARROWED,
  },
  {
    name: "Events",
    address: (i) => `/ws/${i.workspace}/m/${i.manager}/events`,
    data: (i) => [`${mgr(i)}/events`],
    heading: "Events",
    open: NOT_NARROWED,
  },
  {
    name: "A task",
    address: (i) => `/ws/${i.workspace}/m/${i.manager}/tasks/DT-1`,
    data: (i) => [`${mgr(i)}/tasks/DT-1`],
    heading: "Write the v2.3 changelog",
    open: ALL,
  },
  {
    name: "A run",
    address: (i) => `/ws/${i.workspace}/m/${i.manager}/runs/run-1`,
    data: (i) => [`${mgr(i)}/runs/run-1`],
    heading: "writer on DT-1",
    open: ALL,
  },
  {
    name: "Manager settings: Sources",
    address: (i) => `/ws/${i.workspace}/m/${i.manager}/settings/sources`,
    data: (i) => [`${mgr(i)}/github`, "/email"],
    heading: "Settings",
    open: NOT_NARROWED,
  },
  {
    name: "Manager settings: Who may ask",
    address: (i) => `/ws/${i.workspace}/m/${i.manager}/settings/who-may-ask`,
    data: (i) => [`${mgr(i)}/policy`],
    heading: "Settings",
    open: NOT_NARROWED,
  },
  {
    name: "Manager settings: Permissions",
    address: (i) => `/ws/${i.workspace}/m/${i.manager}/settings/permissions`,
    data: (i) => [`${mgr(i)}/permissions`],
    heading: "Settings",
    open: NOT_NARROWED,
  },
  {
    name: "Manager settings: Board",
    address: (i) => `/ws/${i.workspace}/m/${i.manager}/settings/board`,
    // Its data is the board itself, which everyone reads.
    data: () => [],
    heading: "Settings",
    open: NOT_NARROWED,
  },
  { name: "Agents", address: (i) => `/ws/${i.workspace}/build/agents`, data: () => ["/agents"], heading: "Agents", open: ALL },
  { name: "Skills", address: (i) => `/ws/${i.workspace}/build/skills`, data: () => ["/skills"], heading: "Skills", open: ALL },
  {
    name: "Templates",
    address: (i) => `/ws/${i.workspace}/build/templates`,
    data: () => ["/templates"],
    heading: "Templates",
    open: ALL,
  },
  {
    name: "Environments",
    address: (i) => `/ws/${i.workspace}/environments`,
    data: () => ["/environments"],
    heading: "Environments",
    open: BUILDERS,
  },
  { name: "People", address: (i) => `/ws/${i.workspace}/people`, data: () => ["/people"], heading: "People", open: ALL },
  { name: "Profile", address: (i) => `/ws/${i.workspace}/settings/profile`, data: () => ["/me"], heading: "Profile", open: ALL },
  {
    name: "Notifications",
    address: (i) => `/ws/${i.workspace}/settings/notifications`,
    data: () => ["/me"],
    heading: "Notifications",
    open: ALL,
  },
  // General's own data, the name and address, is read by everyone: the sidebar shows the workspace's name.
  { name: "General", address: (i) => `/ws/${i.workspace}/settings/general`, data: () => ["/export"], heading: "General", open: OWNER },
  {
    name: "Members",
    address: (i) => `/ws/${i.workspace}/settings/members`,
    data: () => ["/permissions", "/join"],
    heading: "Members",
    open: OWNER,
  },
  {
    name: "Roles and permissions",
    address: (i) => `/ws/${i.workspace}/settings/roles`,
    // The presets and what each may do are read by everyone, to see what their own role is.
    data: () => ["/permissions"],
    heading: "Roles and permissions",
    open: OWNER,
  },
  {
    name: "Keys and connections",
    address: (i) => `/ws/${i.workspace}/settings/keys`,
    data: () => ["/models", "/connections"],
    heading: "Keys and connections",
    open: OWNER,
  },
  { name: "Usage", address: (i) => `/ws/${i.workspace}/settings/usage`, data: () => ["/usage"], heading: "Usage", open: OWNER },
  { name: "Billing", address: (i) => `/ws/${i.workspace}/settings/billing`, data: () => ["/billing"], heading: "Billing", open: OWNER },
  { name: "Security", address: (i) => `/ws/${i.workspace}/settings/security`, data: () => ["/join"], heading: "Security", open: OWNER },
  { name: "Audit log", address: (i) => `/ws/${i.workspace}/settings/audit`, data: () => ["/audit"], heading: "Audit log", open: OWNER },
];

/** The sidebar's links and buttons, by name, and who is offered each. */
export const NAVIGATION: readonly { readonly name: string; readonly role: "link" | "button"; readonly open: readonly Who[] }[] = [
  { name: "Home", role: "link", open: ALL },
  { name: "Inbox", role: "link", open: ALL },
  { name: "Chat", role: "link", open: ALL },
  { name: "Overview", role: "link", open: ALL },
  { name: "Board", role: "link", open: ALL },
  { name: "Mission", role: "link", open: ["owner", "builder", "member", "granted"] },
  { name: "Events", role: "link", open: ["owner", "builder", "member", "granted"] },
  { name: "Launch settings", role: "link", open: NOT_NARROWED },
  { name: "Agents", role: "link", open: ALL },
  { name: "Skills", role: "link", open: ALL },
  { name: "Templates", role: "link", open: ALL },
  { name: "Environments", role: "link", open: BUILDERS },
  { name: "People", role: "link", open: ALL },
  { name: "Settings", role: "link", open: OWNER },
  { name: "New manager", role: "button", open: ["owner", "builder", "granted", "narrowed"] },
];
