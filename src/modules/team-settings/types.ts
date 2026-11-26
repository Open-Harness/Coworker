import type { Loaded } from "~/modules/team-core/types.ts";
import type { AccountApi, MoreApi } from "./views.ts";

export type * from "./views.ts";

/* A workspace's settings, its people and its environments, as their screens show them. */

export type Role = "owner" | "builder" | "member";

export interface WorkspaceData {
  readonly workspaceId: string;
  readonly name: string;
  readonly address: string;
  readonly region: "eu" | "us";
  readonly createdAt: number;
  readonly role: Role;
}

export interface MemberData {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: Role;
  readonly joinedAt: number;
}

export interface InviteData {
  readonly id: string;
  readonly email: string;
  readonly role: Role;
  readonly expiresAt: number;
}

export interface JoiningData {
  readonly linksOn: boolean;
  /** Relative to the app's address. */
  readonly linkPath?: string;
  readonly domains: readonly string[];
}

export type KeySource = "anthropic" | "openai" | "google" | "opencode";
export type ModelSource = KeySource | "endpoint" | "chatgpt";

export interface ModelData {
  readonly id: string;
  readonly source: ModelSource;
  readonly label: string;
  readonly baseUrl: string;
  readonly models: readonly string[];
  readonly checkedAt: number;
  /** What the provider said when the last test call failed. */
  readonly error?: string;
}

export interface KeysData {
  readonly connections: readonly ModelData[];
  /** Why no manager can start, when none can. */
  readonly notReady?: string;
}

export type NewModel =
  | { readonly source: KeySource; readonly key: string; readonly label?: string }
  | { readonly source: "endpoint"; readonly label: string; readonly baseUrl: string; readonly key?: string };

export interface GitHubData {
  /** The account the App is installed on; absent when it is not. */
  readonly account?: string;
  readonly repos: readonly string[];
  /** GitHub's page for installing the App. Absent when this deployment has no App. */
  readonly installUrl?: string;
}

/** What GitHub brought back: which installation, the code it signs the person in with, and what the page was opened for. */
export interface GitHubInstalled {
  readonly installationId: number;
  readonly code: string;
  readonly state: string;
}

export interface BillingData {
  readonly plan: string;
  readonly seatCents: number;
  readonly includedHoursPerSeat: number;
  readonly overageCentsPerHour: number;
  readonly seats: number;
  readonly nextSeats: number;
  readonly periodStart: number;
  readonly renewsAt: number;
  readonly hoursUsed: number;
  readonly hoursIncluded: number;
  readonly hoursOver: number;
  readonly overageCents: number;
  readonly limitOn: boolean;
  readonly limitCents: number;
  readonly stopped: boolean;
}

export interface AuditData {
  readonly at: number;
  readonly by: string;
  readonly isManager: boolean;
  readonly sentence: string;
  readonly permission: string;
  readonly approvedBy?: string;
  readonly outcome: "done" | "refused" | "asked" | "failed";
  readonly managerId: string;
}

export interface AuditPage {
  readonly entries: readonly AuditData[];
  /** Asks for the lines before this page; absent at the end. */
  readonly next?: string;
}

export interface EnvironmentData {
  readonly id: string;
  readonly name: string;
  readonly setup: string;
  readonly size: string;
  readonly version: number;
  readonly updatedAt: number;
  readonly status: "Not started" | "Ready" | "Failed";
  readonly usedBy: readonly string[];
  /** The setup's output when it failed. */
  readonly output?: string;
}

export interface SaveEnvironment {
  /** Absent for a new one. */
  readonly id?: string;
  readonly name: string;
  readonly setup: string;
  readonly size: string;
}

export interface HandleData {
  readonly kind: string;
  readonly id: string;
  readonly display?: string;
  readonly proof: string;
}

/** Someone the workspace knows: a member, or someone an Owner vouched for. */
export interface PersonData {
  readonly person: string;
  readonly name: string;
  readonly role?: Role;
  readonly handles: readonly HandleData[];
}

export interface NewHandle {
  readonly person: string;
  readonly kind: string;
  readonly id: string;
  readonly display?: string;
}

/** The server, as these screens use it. */
export interface SettingsApi extends MoreApi {
  readonly account: AccountApi;
  /** Where the app is served, so a copied link is whole. */
  readonly origin: string;
  readonly workspace: (workspaceId: string) => Promise<Loaded<WorkspaceData>>;
  readonly removeWorkspace: (workspaceId: string) => Promise<Loaded<true>>;
  readonly members: (workspaceId: string) => Promise<Loaded<readonly MemberData[]>>;
  readonly invites: (workspaceId: string) => Promise<Loaded<readonly InviteData[]>>;
  /** Sending one again restarts its 7 days. */
  readonly invite: (workspaceId: string, email: string, role: Role, again: boolean) => Promise<Loaded<true>>;
  readonly cancelInvite: (inviteId: string) => Promise<Loaded<true>>;
  readonly setRole: (workspaceId: string, memberId: string, role: Role) => Promise<Loaded<true>>;
  readonly removeMember: (workspaceId: string, memberId: string) => Promise<Loaded<true>>;
  readonly joining: (workspaceId: string) => Promise<Loaded<JoiningData>>;
  readonly setLinks: (workspaceId: string, on: boolean) => Promise<Loaded<JoiningData>>;
  readonly setDomains: (workspaceId: string, domains: readonly string[]) => Promise<Loaded<JoiningData>>;
  readonly keys: (workspaceId: string) => Promise<Loaded<KeysData>>;
  readonly addModel: (workspaceId: string, input: NewModel) => Promise<Loaded<true>>;
  /** The address to sign in to ChatGPT at; `finishChatGpt` takes the address the browser ended on. */
  readonly startChatGpt: (workspaceId: string) => Promise<Loaded<string>>;
  readonly finishChatGpt: (workspaceId: string, redirectUrl: string) => Promise<Loaded<true>>;
  /** `managerId` is who the install page is opened for, to come back to. */
  readonly gitHub: (workspaceId: string, managerId?: string) => Promise<Loaded<GitHubData>>;
  readonly connectGitHub: (workspaceId: string, installed: GitHubInstalled) => Promise<Loaded<true>>;
  readonly billing: (workspaceId: string) => Promise<Loaded<BillingData>>;
  readonly setLimit: (workspaceId: string, on: boolean, overCents: number) => Promise<Loaded<BillingData>>;
  readonly environments: (workspaceId: string) => Promise<Loaded<readonly EnvironmentData[]>>;
  readonly saveEnvironment: (workspaceId: string, input: SaveEnvironment) => Promise<Loaded<true>>;
  /** `undefined` takes the agent out of any environment. */
  readonly assignAgent: (workspaceId: string, agent: string, environmentId: string | undefined) => Promise<Loaded<true>>;
  readonly storeSecret: (workspaceId: string, name: string, value: string) => Promise<Loaded<true>>;
  readonly people: (workspaceId: string) => Promise<Loaded<readonly PersonData[]>>;
  readonly addHandle: (workspaceId: string, input: NewHandle) => Promise<Loaded<true>>;
}

export interface ScreenProps {
  readonly api: SettingsApi;
  readonly workspaceId: string;
}

export interface SettingsPagesProps {
  readonly workspaceId: string;
  /** The part of the address that names the page. */
  readonly page: string;
  /** The workspace was deleted. */
  readonly onGone: () => void;
  /** Whether a screen holds changes nobody saved yet, so the route can ask before leaving. */
  readonly onDirty?: (isDirty: boolean) => void;
}
