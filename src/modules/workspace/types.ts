import type { StoreAnswer, StoreOp } from "~/modules/console/types.ts";
import type { GitHubApi, GitHubConnection, Installation, LostConnection, RepoSource } from "~/modules/github/types.ts";
import type { Billing, BillingView, SpendLimit } from "~/modules/billing/types.ts";
import type { Clock, Ids } from "~/modules/clock/types.ts";
import type { ActionRecord, ApprovalRequest, AuditQuery, By } from "~/modules/actions/types.ts";
import type { Mailer } from "~/modules/mail/types.ts";
import type { SettingsCall, SettingsResult } from "~/modules/settings/types.ts";
import type {
  AgentLookup,
  AgentSummary,
  Answer,
  AskResult,
  AuditLine,
  InboxRequest,
  ManagerObjects,
  QuestionDetail,
  SkillRead,
  TemplateId,
} from "~/modules/manager/types.ts";
import type {
  AddEndpoint,
  AddKey,
  AddResult,
  ModelCall,
  ModelConnection,
  ModelPick,
  ModelRoute,
  Readiness,
} from "~/modules/models/types.ts";
import type { MasterKeys, SecretInfo } from "~/modules/vault/types.ts";
import type { Handle, Policy, Routed, Trigger } from "~/modules/triggers/types.ts";
import type { CommandRequest, EnvironmentView, ExecOutcome, SandboxHost, SaveEnvironment, SaveResult } from "~/modules/sandboxes/types.ts";

export type * from "./joining.ts";
import type { JoinProof, JoinRequester, JoinSettingsResult, RequestJoinResult, SetDomainsResult } from "./joining.ts";

/** Where a workspace's data lives. Its object is created in that jurisdiction and never moves. */
export type Region = "eu" | "us";

export interface WorkspaceProfile {
  readonly workspaceId: string;
  readonly name: string;
  /** What managers' addresses end in: `<manager>.<address>@co-worker.tech`. */
  readonly address: string;
  readonly region: Region;
  readonly createdBy: string;
  readonly createdAt: number;
}

export type ProvisionResult = { readonly _tag: "Provisioned" } | { readonly _tag: "AlreadyProvisioned"; readonly workspaceId: string };
export type NotProvisioned = { readonly _tag: "NotProvisioned" };
export type DescribeResult = { readonly _tag: "Found"; readonly profile: WorkspaceProfile } | { readonly _tag: "NotProvisioned" };

/** One manager in the workspace's list: where its object is and how people reach it. */
export interface ManagerEntry {
  readonly managerId: string;
  readonly name: string;
  readonly slug: string;
  readonly address: string;
  readonly template: TemplateId;
  readonly objectId: string;
  readonly region: Region;
  readonly createdAt: number;
}

export interface CreateManager {
  readonly name: string;
  /** The local part of its address. Made from the name when omitted. */
  readonly slug?: string;
  readonly template: TemplateId;
  /** What it is for, for its mission page. The template's own when omitted. */
  readonly mission?: string;
  readonly createdBy: string;
}

export type CreateManagerResult =
  | { readonly _tag: "Created"; readonly manager: ManagerEntry }
  | { readonly _tag: "AddressTaken" }
  | { readonly _tag: "InvalidAddress"; readonly reason: string }
  | { readonly _tag: "Failed"; readonly message: string }
  | NotProvisioned;

/** One line of the workspace's action log: who did what, under which permission. */
export type AuditEntry = Omit<ActionRecord, "input"> & { readonly managerId: string };

export interface AuditPage {
  readonly entries: readonly AuditEntry[];
  /** Where the next, older page starts. Absent on the last. */
  readonly next?: string;
}

/** Something waiting for one person: an approval or a question from a manager. */
export interface InboxItem {
  readonly id: string;
  /** A notice is only to read: the workspace telling an Owner something, with no manager waiting. */
  readonly kind: "approval" | "question" | "notice";
  readonly to: string;
  readonly managerId: string;
  readonly managerName: string;
  readonly title: string;
  readonly options: readonly string[];
  readonly task?: string;
  readonly detail?: QuestionDetail;
  readonly createdAt: number;
  readonly answer?: Answer;
}

/** One Person's Handles, beyond the sign-in email their person id is made of. */
export interface PersonHandles {
  readonly person: string;
  readonly handles: readonly Handle[];
}

export type AddHandleResult = { readonly _tag: "Added"; readonly handles: readonly Handle[] } | { readonly _tag: "HeldByAnother" };

export type SetSourcesResult =
  | { readonly _tag: "Set"; readonly connection: GitHubConnection }
  | { readonly _tag: "NotConnected" }
  | { readonly _tag: "NotReachable"; readonly repo: string };

/** One line in a manager's Events: what arrived and what happened to it. */
export interface EventEntry {
  readonly at: number;
  readonly line: string;
  readonly trigger?: string;
}

export type AnswerResult =
  /** `admit` is the account a request to join just let in: the caller adds it as a Member. */
  | { readonly _tag: "Answered"; readonly item: InboxItem; readonly admit?: string }
  | { readonly _tag: "AlreadyAnswered" }
  | { readonly _tag: "NoSuchItem" };

/**
 * One tenant's Durable Object, as a caller sees it through its stub. An object nobody provisioned answers
 * `NotProvisioned` to everything, so guessing an id creates nothing.
 */
export interface WorkspaceApi {
  provision(profile: WorkspaceProfile): Promise<ProvisionResult>;
  describe(): Promise<DescribeResult>;
  /** Stores a secret in the workspace's vault. The value is never returned. */
  storeSecret(name: string, value: string): Promise<{ readonly _tag: "Stored" } | NotProvisioned>;
  secrets(): Promise<readonly SecretInfo[]>;
  addModelKey(input: AddKey): Promise<AddResult | NotProvisioned>;
  addModelEndpoint(input: AddEndpoint): Promise<AddResult | NotProvisioned>;
  startChatGpt(): Promise<{ readonly _tag: "SignIn"; readonly authorizeUrl: string } | NotProvisioned>;
  /** Finishes the sign-in and sets the alarm that refreshes its tokens before they expire. */
  finishChatGpt(redirectUrl: string): Promise<AddResult | NotProvisioned>;
  modelConnections(): Promise<readonly ModelConnection[]>;
  /** Whether a manager may start here, and why not. */
  modelReadiness(): Promise<Readiness>;
  /** From managers: which connection their model calls go to, with no key and no provider address. */
  modelRoute(wanted?: ModelPick): Promise<ModelRoute>;
  /** From managers: the saved agent by name as a run starting now takes it, the agents a manager may start, and a skill's file. */
  agent(name: string): Promise<AgentLookup>;
  agents(): Promise<readonly AgentSummary[]>;
  skillFile(input: { readonly skill: string; readonly version: number; readonly path: string }): Promise<SkillRead>;
  /** From managers: one model call, made here with the workspace's credential. The answer streams back and holds no key. */
  modelCall(call: ModelCall): Promise<Response>;
  joinSettings(): Promise<JoinSettingsResult>;
  /** Turning links on makes a new secret, so links shared before are dead. */
  setInviteLinks(on: boolean): Promise<JoinSettingsResult>;
  setApprovedDomains(domains: readonly string[]): Promise<SetDomainsResult>;
  /** An approval for each of these Owners; the first answer decides. */
  requestJoin(person: JoinRequester, owners: readonly string[]): Promise<RequestJoinResult>;
  /** Whether the workspace lets this proof join, now. */
  allowsJoin(proof: JoinProof): Promise<boolean>;
  /** Makes a manager from a template: its object, mission page, board lanes and email address. */
  createManager(input: CreateManager): Promise<CreateManagerResult>;
  managers(): Promise<readonly ManagerEntry[]>;
  /** From managers: audit lines, each once by its key. */
  recordActions(lines: readonly AuditLine[]): Promise<void>;
  auditLog(limit: number): Promise<readonly AuditEntry[]>;
  auditQuery(query: AuditQuery): Promise<AuditPage>;
  /** A person's button waits for these Owners' say. Allowed, the manager runs it as theirs. */
  requestApproval(
    call: ApprovalRequest,
    approvers: readonly string[],
  ): Promise<{ readonly _tag: "Requested" | "AlreadyRequested" } | NotProvisioned>;
  /** What the Settings screens change, one call per change, each for the person who asked. See the settings module. */
  settings(call: SettingsCall, by: By): Promise<SettingsResult | NotProvisioned>;
  /** From managers: one Inbox item per id. */
  ask(request: InboxRequest): Promise<AskResult>;
  inbox(personId: string): Promise<readonly InboxItem[]>;
  /** A person answers an item that was for them; the manager waiting on it is woken. */
  answer(itemId: string, answer: Answer): Promise<AnswerResult>;
  /** From Sources: stores a Trigger once, routes it as a follow-up or through the Gate, and hands work to its manager. */
  receive(trigger: Trigger): Promise<Routed>;
  /** From managers: the Task now follows these Threads. */
  follow(managerId: string, task: string, threads: Trigger["threads"]): Promise<void>;
  /** A line in a manager's Events for something a Source dropped before it became a Trigger. */
  logEvent(managerId: string, line: string): Promise<void>;
  events(managerId: string, limit: number): Promise<readonly EventEntry[]>;
  policy(managerId: string): Promise<Policy>;
  setPolicy(managerId: string, policy: Policy): Promise<Policy>;
  /** Gives a Person a Handle with its proof. The Gate then knows them by it. */
  addHandle(person: string, handle: Handle): Promise<AddHandleResult>;
  people(): Promise<readonly PersonHandles[]>;
  /** Records the workspace's GitHub installation. The caller checked that GitHub has it. */
  connectGitHub(installation: Installation): Promise<GitHubConnection>;
  gitHub(): Promise<GitHubConnection>;
  /** What the App was on when it was uninstalled, until it is installed again. */
  gitHubLost(): Promise<LostConnection | undefined>;
  /** The repos a manager hears and, per repo, which events. */
  setRepoSources(managerId: string, sources: readonly Omit<RepoSource, "managerId">[]): Promise<SetSourcesResult>;
  /** The App was uninstalled: its sources stop and these Owners get a notice. */
  gitHubRemoved(installation: number, owners: readonly string[]): Promise<void>;
  /** The Environments screen, and which agent runs in which. */
  environments(): Promise<readonly EnvironmentView[]>;
  saveEnvironment(input: SaveEnvironment): Promise<SaveResult | NotProvisioned>;
  /** A run's command, in its agent's environment, with its secrets from the vault. */
  sandbox(request: CommandRequest): Promise<ExecOutcome | NotProvisioned>;
  /** The Billing screen: seats, this period's hours and the limit. */
  billing(): Promise<BillingView | NotProvisioned>;
  setSpendLimit(limit: SpendLimit): Promise<{ readonly _tag: "Set"; readonly billing: BillingView } | NotProvisioned>;
  /** After someone joined or left: how many members there are now. */
  membersChanged(members: number): Promise<void>;
  /** The console's own rows: what each doing did, the audit log, settings, the tree, what came in. See `console`. */
  consoleStore(op: StoreOp): Promise<StoreAnswer | NotProvisioned>;
  /** Erases everything the object holds, its data key and its managers included. */
  destroy(): Promise<{ readonly _tag: "Destroyed" }>;
}

export interface WorkspaceDependencies {
  readonly clock: Clock;
  readonly masterKeys: MasterKeys;
  readonly ids: Ids;
  /** Reaches model providers for test calls. */
  readonly fetch: typeof fetch;
  readonly managers: ManagerObjects;
  /** Where managers' addresses live: `launch.acme@<mailDomain>`. */
  readonly mailDomain: string;
  /** Where sandboxes run. */
  readonly sandboxes: SandboxHost;
  readonly billing: Billing;
  /** GitHub's API as the App calls it: a command's token is made here. */
  readonly github: GitHubApi;
  /** Mail a person asked for. */
  readonly mailer: Mailer;
  /** The address the workspace's own mail is sent from. */
  readonly sendFrom: string;
}
