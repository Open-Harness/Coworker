import type { AcceptMode, Admission, Allow, GitHubEvent, HandleRef, Permission, ViewName } from "../types.ts";

/** The words screens use for what the server's values mean. */

export const MODES: readonly { readonly value: AcceptMode; readonly label: string; readonly about: string }[] = [
  { value: "off", label: "Off", about: "Only explicit requests become work." },
  { value: "observe", label: "Observe", about: "Inferred work is shown as “would accept”. Nothing starts." },
  { value: "auto", label: "Auto", about: "Inferred work from someone allowed becomes a task." },
];

export const ADMISSIONS: readonly { readonly value: Admission; readonly label: string }[] = [
  { value: "ignore", label: "Ignored" },
  { value: "inferred", label: "Inferred: the manager decides" },
  { value: "explicit", label: "Explicit: accepted as asked" },
];

export const PERMISSIONS: readonly { readonly value: Permission; readonly label: string }[] = [
  { value: "on", label: "On" },
  { value: "ask", label: "Ask" },
  { value: "off", label: "Off" },
];

export const VIEW_LABEL: Readonly<Record<ViewName, string>> = { kanban: "Kanban", list: "List", console: "Console", inbox: "Inbox" };

/** The catalogue's categories, as the screens say them. */
export const CATEGORY_LABEL: Readonly<Record<string, string>> = {
  read: "Read",
  board: "Board",
  tasks: "Tasks",
  triage: "Triage",
  runs: "Agents and runs",
  mission: "Mission",
  outside: "Talk to the outside",
  "who-may-ask": "Who may ask",
  sources: "Sources",
  itself: "Itself",
  workspace: "Workspace",
};
export const categoryLabel = (category: string): string => CATEGORY_LABEL[category] ?? category;

export const handleWords = ({ kind, id }: HandleRef): string => `${kind} · ${id}`;

export const sameHandle = (one: HandleRef, other: HandleRef): boolean =>
  one.kind === other.kind && one.id === other.id && one.space === other.space;

export const allowKey = (entry: Allow): string =>
  entry.kind === "person"
    ? `person:${entry.person}`
    : entry.kind === "domain"
      ? `domain:${entry.domain}`
      : `handle:${handleWords(entry.handle)}`;

/** What a scope is, in a person's words: `repo:acme/api:issues` is issues in acme/api. */
export function scopeWords(scope: string): string {
  if (scope === "mailbox") return "Email to this manager";
  const [kind, repo, event] = scope.split(":");
  return kind === "repo" && repo !== undefined && event !== undefined ? `GitHub ${repo} · ${event}` : scope;
}

/** Milliseconds as `Timestamp` wants them. */
export const seconds = (at: number): number => Math.floor(at / 1000);

export const BUILDERS_ONLY = "Only Owners and Builders change this. You can read it.";

/** What GitHub calls its events, as a person reads them. */
export const EVENT_LABEL: Readonly<Record<GitHubEvent, string>> = {
  issues: "Issues",
  issue_comment: "Comments on issues and pull requests",
  pull_request: "Pull requests",
  pull_request_review: "Reviews",
  check_run: "Checks",
};
