import type { AgentConfig } from "~/modules/agents/types.ts";
import type { Loaded } from "~/modules/team-core/types.ts";
import type { RepoSourceData, GitHubSources, EmailData } from "./views.ts";

export type * from "./views.ts";

/*
 * What a Builder shapes: each manager's settings (sources, who may ask, permissions, board), its events, the template
 * gallery, the workspace's agents and skills, and the Task and run pages. The server's answers arrive as `unknown`
 * and are narrowed into these shapes before any screen sees them.
 */

export type Role = "owner" | "builder" | "member";
export type ViewName = "kanban" | "list" | "console" | "inbox";
export type FieldType = "select" | "text" | "number" | "date" | "person";
export type Tone = "red" | "amber" | "green";

export interface LaneInfo {
  readonly id: string;
  readonly name: string;
  readonly meaning: string;
  readonly needsApproval: boolean;
  readonly limit?: number;
}
export interface FieldInfo {
  readonly key: string;
  readonly label: string;
  readonly type: FieldType;
  readonly options: readonly { readonly value: string; readonly tone?: Tone }[];
}
export interface ManagerInfo {
  readonly managerId: string;
  readonly name: string;
  readonly address: string;
  readonly template: string;
  readonly lanes: readonly LaneInfo[];
  readonly fields: readonly FieldInfo[];
  readonly defaultView: ViewName;
  readonly tasks: readonly { readonly id: string; readonly lane: string }[];
}

/** Who may ask: the Gate's rules for one manager. */
export type AcceptMode = "off" | "observe" | "auto";
export type Admission = "ignore" | "inferred" | "explicit";
export interface HandleRef {
  readonly kind: string;
  readonly space?: string;
  readonly id: string;
}
export type Allow =
  | { readonly kind: "person"; readonly person: string }
  | { readonly kind: "domain"; readonly domain: string }
  | { readonly kind: "handle"; readonly handle: HandleRef };
export interface PolicyData {
  readonly acceptMode: AcceptMode;
  readonly allowed: readonly Allow[];
  readonly admission: Readonly<Record<string, Admission>>;
  readonly bots: readonly HandleRef[];
}
export interface PersonName {
  readonly person: string;
  readonly name: string;
}

/** What a manager may do: on, ask or off, per category and per action. */
export type Permission = "on" | "ask" | "off";
export type Settings = Readonly<Record<string, Permission>>;
export interface ActionRow {
  readonly id: string;
  readonly category: string;
  readonly label: string;
  readonly screen: string;
  readonly default: Permission;
}
export interface PermissionsData {
  readonly categories: Settings;
  readonly actions: Settings;
  readonly template: string;
  readonly templateDefaults: { readonly categories: Settings; readonly actions: Settings };
  readonly catalogue: readonly ActionRow[];
  readonly categoryDefaults: Settings;
}

/** What a button press came to: done, or waiting for an Owner to allow it. */
export type Pressed = { readonly _tag: "Done" } | { readonly _tag: "Waiting"; readonly sentence: string };

/** What the manager decided about a Trigger: it became a Task, joined one, or was ignored. */
export type EventDecision = { kind: "accept" | "attach" | "ignore"; task?: string; reason?: string; wouldAccept?: boolean };

export interface EventLine {
  readonly at: number;
  readonly line: string;
  readonly decision?: EventDecision;
}

export interface TemplateData {
  readonly id: string;
  readonly name: string;
  readonly about: string;
  readonly opensOn: ViewName;
  readonly lanes: readonly string[];
  readonly fields: readonly string[];
}

export interface VersionData {
  readonly version: number;
  readonly savedAt: number;
  readonly savedBy: string;
  readonly note: string;
}
/** A model a new agent can think with: a connection and what it offers. */
export interface ModelOption {
  readonly connectionId: string;
  readonly label: string;
  readonly models: readonly string[];
}
export interface AgentData {
  readonly id: string;
  readonly config: AgentConfig;
  readonly version: number;
  readonly versions: readonly VersionData[];
}
export interface AgentOptions {
  readonly environments: readonly { readonly id: string; readonly name: string }[];
}
export interface AgentSave {
  /** Absent for a new one. */
  readonly id?: string;
  readonly config: AgentConfig;
  readonly note: string;
}
export interface SkillData {
  readonly id: string;
  readonly name: string;
  readonly files: Readonly<Record<string, string>>;
  readonly version: number;
  readonly checks: readonly { readonly level: "ok" | "warn" | "error"; readonly text: string }[];
  readonly versions: readonly VersionData[];
}
export type SkillSave = Pick<SkillData, "name" | "files"> & { readonly id?: string; readonly note: string };

export type FieldValue = string | number | boolean | null;
export interface RunSummary {
  readonly id: string;
  readonly role: string;
  readonly agent: string;
  readonly attempt: number;
  readonly state: "queued" | "running" | "ended";
}
/** One task with its comments and history. */
export interface TaskPage {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly lane: string;
  readonly stageLabel: string;
  readonly values: Readonly<Record<string, FieldValue>>;
  readonly owner?: string;
  readonly comments: readonly { readonly id: string; readonly by: string; readonly at: number; readonly text: string }[];
  readonly history: readonly { readonly at: number; readonly by: string; readonly sentence: string }[];
  readonly runs: readonly RunSummary[];
  readonly mandate?: { readonly trigger: string; readonly strength: string; readonly source: string; readonly sender: string };
}
export interface ReportData {
  readonly outcome: string;
  readonly summary: string;
}
export interface RunData extends RunSummary {
  readonly task: string;
  readonly report?: ReportData;
  readonly note?: string;
  /** Set when a person or the manager stopped the run: who, and when (milliseconds since the epoch). */
  readonly stopped?: { readonly by: string; readonly at: number };
  /** `streaming` marks the words being written now, which grow until they are an entry of their own. */
  readonly lines: readonly {
    readonly id: string;
    readonly role: "person" | "manager" | "action";
    readonly text: string;
    readonly streaming?: true;
  }[];
}

/** The server, as these screens use it. Every call answers with the server's own words when it fails. */
export interface BuildApi {
  /** The person's role here, and the models the workspace can think with. */
  readonly general: (workspaceId: string) => Promise<Loaded<{ readonly role: Role; readonly models: readonly ModelOption[] }>>;
  readonly manager: (workspaceId: string, managerId: string) => Promise<Loaded<ManagerInfo>>;
  /** A button a manager has too: one action by its id. */
  readonly press: (
    workspaceId: string,
    managerId: string,
    actionId: string,
    input: Readonly<Record<string, unknown>>,
    requestId: string,
  ) => Promise<Loaded<Pressed>>;
  readonly policy: (workspaceId: string, managerId: string) => Promise<Loaded<PolicyData>>;
  readonly setPolicy: (workspaceId: string, managerId: string, policy: PolicyData) => Promise<Loaded<PolicyData>>;
  readonly people: (workspaceId: string) => Promise<Loaded<readonly PersonName[]>>;
  readonly github: (workspaceId: string, managerId: string) => Promise<Loaded<GitHubSources>>;
  readonly setRepos: (workspaceId: string, managerId: string, repos: readonly RepoSourceData[]) => Promise<Loaded<GitHubSources>>;
  /** GitHub's page for installing the App for this manager; absent when this deployment has no App. */
  readonly installUrl: (workspaceId: string, managerId: string) => Promise<Loaded<{ readonly url: string | undefined }>>;
  readonly email: (workspaceId: string) => Promise<Loaded<EmailData>>;
  /** Mails the person from the manager's address; answers where it went. */
  readonly testMail: (workspaceId: string, managerId: string) => Promise<Loaded<string>>;
  readonly permissions: (workspaceId: string, managerId: string) => Promise<Loaded<PermissionsData>>;
  readonly events: (workspaceId: string, managerId: string) => Promise<Loaded<readonly EventLine[]>>;
  readonly templates: (workspaceId: string) => Promise<Loaded<readonly TemplateData[]>>;
  /** Makes a manager and answers its id. */
  readonly createManager: (
    workspaceId: string,
    input: { readonly name: string; readonly template: string; readonly mission?: string },
  ) => Promise<Loaded<string>>;
  readonly agents: (workspaceId: string) => Promise<Loaded<{ readonly agents: readonly AgentData[]; readonly options: AgentOptions }>>;
  readonly saveAgent: (workspaceId: string, input: AgentSave) => Promise<Loaded<AgentData>>;
  readonly deleteAgent: (workspaceId: string, id: string) => Promise<Loaded<true>>;
  readonly skills: (workspaceId: string) => Promise<Loaded<readonly SkillData[]>>;
  readonly saveSkill: (workspaceId: string, input: SkillSave) => Promise<Loaded<SkillData>>;
  readonly deleteSkill: (workspaceId: string, id: string) => Promise<Loaded<true>>;
  readonly task: (workspaceId: string, managerId: string, taskId: string) => Promise<Loaded<TaskPage>>;
  readonly run: (workspaceId: string, managerId: string, runId: string) => Promise<Loaded<RunData>>;
}
