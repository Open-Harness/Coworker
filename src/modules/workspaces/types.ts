import type { Answer } from "~/modules/manager/types.ts";
import type { ApprovalRequest } from "~/modules/actions/types.ts";
import type { AddHandleResult, AnswerResult, JoinRequester } from "~/modules/workspace/types.ts";
import type { Handle } from "~/modules/triggers/types.ts";
import type { GitHubConnection, Installation } from "~/modules/github/types.ts";
import type { Auth, NewUser, PersonChange, Preset } from "~/modules/auth/types.ts";
import type { Clock } from "~/modules/clock/types.ts";
import type { GeneralView, ModelChoice } from "~/modules/settings/types.ts";
import type { Region, WorkspaceApi, WorkspaceProfile } from "~/modules/workspace/types.ts";

/** A workspace as one of its members sees it in their list. */
export interface WorkspaceEntry {
  readonly workspaceId: string;
  readonly name: string;
  readonly address: string;
  readonly region: Region;
  readonly role: Preset;
}

export interface CreateWorkspace {
  readonly userId: string;
  readonly name: string;
  readonly address: string;
  readonly region: Region;
}

export type CreateWorkspaceResult =
  | { readonly _tag: "Created"; readonly workspace: WorkspaceEntry }
  | { readonly _tag: "AddressTaken" }
  | { readonly _tag: "InvalidAddress"; readonly reason: string }
  | { readonly _tag: "Failed"; readonly message: string };

export type OpenWorkspaceResult =
  | { readonly _tag: "Opened"; readonly profile: WorkspaceProfile; readonly role: Preset }
  | { readonly _tag: "NotMember" }
  | { readonly _tag: "Failed"; readonly message: string };

export type RemoveWorkspaceResult =
  | { readonly _tag: "Removed" }
  | { readonly _tag: "NotMember" }
  | { readonly _tag: "NotOwner" }
  | { readonly _tag: "Failed"; readonly message: string };

/** What a request needs of the person: membership, or the Owner preset that opens Settings. */
export type Need = "member" | "settings";

export type ReachResult =
  | { readonly _tag: "Reached"; readonly object: WorkspaceApi; readonly role: Preset }
  | { readonly _tag: "NotMember" }
  | { readonly _tag: "NotOwner" };

/** How people join a workspace besides an emailed invite, as an Owner sees it in Settings. */
export interface JoiningSettings {
  readonly _tag: "Settings";
  readonly linksOn: boolean;
  /** The invite link while links are on, relative to the app's address. */
  readonly linkPath?: string;
  readonly domains: readonly string[];
}

export type JoiningResult =
  | JoiningSettings
  | { readonly _tag: "NotMember" }
  | { readonly _tag: "NotOwner" }
  | { readonly _tag: "Failed"; readonly message: string };

export type SetDomainsOutcome = JoiningResult | { readonly _tag: "InvalidDomain"; readonly domain: string };

export type JoinByLinkResult =
  | { readonly _tag: "Joined"; readonly workspaceId: string; readonly role: Preset }
  | { readonly _tag: "AlreadyMember"; readonly workspaceId: string; readonly role: Preset }
  /** The workspace is unknown, links are off, or the secret is wrong: the caller is never told which. */
  | { readonly _tag: "LinkInvalid" }
  | { readonly _tag: "Failed"; readonly message: string };

/** The tenant objects, one per workspace, made in the workspace's jurisdiction. */
export interface TenantObjects {
  /** A new object's id and stub. Nothing exists until the stub is provisioned. */
  readonly mint: (region: Region) => { readonly objectId: string; readonly object: WorkspaceApi };
  readonly get: (objectId: string, region: Region) => WorkspaceApi;
}

export interface WorkspacesDependencies {
  readonly database: D1Database;
  readonly auth: Auth;
  readonly objects: TenantObjects;
  readonly clock: Clock;
}

/**
 * The control plane's workspaces: an organization in Better Auth, its Workspace object, and the `workspace_directory`
 * row between them. Every request for a workspace's data passes membership here first, then goes to its object.
 */
export interface Workspaces {
  readonly create: (input: CreateWorkspace) => Promise<CreateWorkspaceResult>;
  readonly list: (userId: string) => Promise<readonly WorkspaceEntry[]>;
  readonly open: (userId: string, workspaceId: string) => Promise<OpenWorkspaceResult>;
  /** The workspace's own object, once the person passes `need`. */
  readonly reach: (userId: string, workspaceId: string, need: Need) => Promise<ReachResult>;
  /** Owners only. How people may join: invite links on or off, and the approved email domains. */
  readonly joining: (userId: string, workspaceId: string) => Promise<JoiningResult>;
  readonly setInviteLinks: (userId: string, workspaceId: string, on: boolean) => Promise<JoiningResult>;
  readonly setApprovedDomains: (userId: string, workspaceId: string, domains: readonly string[]) => Promise<SetDomainsOutcome>;
  /** A person with the link joins as a Member. */
  readonly joinByLink: (userId: string, workspaceId: string, secret: string) => Promise<JoinByLinkResult>;
  /** The sign-up hook: a new account whose verified email domain a workspace approves joins it as a Member. */
  readonly joinByDomain: (user: NewUser) => Promise<readonly string[]>;
  /** A signed-in person asks the workspace at `address` to let them in: an approval in every Owner's Inbox. */
  readonly requestJoin: (person: JoinRequester, address: string) => Promise<RequestJoinOutcome>;
  /** A member answers an Inbox item for them. A request to join it lets in makes the requester a Member. */
  readonly answer: (userId: string, workspaceId: string, itemId: string, answer: Answer) => Promise<AnswerOutcome>;
  /** The sign-in hook: a person linked an account, joined or left, so their Handles follow. Never throws. */
  readonly personChanged: (change: PersonChange) => Promise<void>;
  /** An address the person proved is theirs becomes a Handle in every workspace they are in. */
  readonly linkEmail: (userId: string, email: string) => Promise<void>;
  /** Owners only: a Handle they vouch for, such as a customer's email or a Slack user. */
  readonly addHandle: (userId: string, workspaceId: string, person: string, handle: Handle) => Promise<AddHandleOutcome>;
  /** Owners only: the workspace's one GitHub installation. One a different workspace claimed is `Taken`. */
  readonly connectGitHub: (userId: string, workspaceId: string, installation: Installation) => Promise<ConnectGitHubResult>;
  /** Owners only: name, address (the organization's slug and the managers' mail domain), time zone, default model. */
  readonly updateGeneral: (userId: string, workspaceId: string, input: UpdateGeneral) => Promise<UpdateGeneralResult>;
  /** A member's press that waits for an Owner (their own setting for it is ask). The Owners' Inboxes get it. */
  readonly approvalFor: (userId: string, workspaceId: string, call: ApprovalRequest) => Promise<ApprovalOutcome>;
  /** Owners only: the workspace's data as a zip. No secret value is in it. */
  readonly exportData: (userId: string, workspaceId: string) => Promise<ExportResult>;
  /** Owners only. Destroys the object (and with it the data key), then the D1 rows. */
  readonly remove: (userId: string, workspaceId: string) => Promise<RemoveWorkspaceResult>;
  /** Owners only: the workspace is destroyed at `at` (a sweep does it); until then it is as it was. */
  readonly scheduleRemoval: (userId: string, workspaceId: string, at: number) => Promise<ScheduleResult>;
  /** Destroys every workspace whose day has come, as `remove` does. Answers how many. */
  readonly removeDue: (now: number) => Promise<number>;
}

export type ScheduleResult =
  | { readonly _tag: "Scheduled"; readonly at: number }
  | { readonly _tag: "NotMember" }
  | { readonly _tag: "NotOwner" };

/** What an Owner changes on the General screen. A field left out stays as it is; `defaultModel: null` clears it. */
export interface UpdateGeneral {
  readonly name?: string;
  readonly address?: string;
  readonly timeZone?: string;
  readonly defaultModel?: ModelChoice | null;
}

export type UpdateGeneralResult =
  | { readonly _tag: "Updated"; readonly general: GeneralView }
  | { readonly _tag: "NotMember" }
  | { readonly _tag: "NotOwner" }
  | { readonly _tag: "AddressTaken" }
  | { readonly _tag: "InvalidAddress"; readonly reason: string }
  | { readonly _tag: "Invalid"; readonly reason: string }
  | { readonly _tag: "Failed"; readonly message: string };

export type ExportResult =
  | { readonly _tag: "Exported"; readonly name: string; readonly bytes: Uint8Array }
  | { readonly _tag: "NotMember" }
  | { readonly _tag: "NotOwner" }
  | { readonly _tag: "Failed"; readonly message: string };

export type ApprovalOutcome =
  | { readonly _tag: "Requested" | "AlreadyRequested" }
  | { readonly _tag: "NotMember" }
  | { readonly _tag: "Failed"; readonly message: string };

export type RequestJoinOutcome =
  | { readonly _tag: "Requested" | "AlreadyRequested" | "AlreadyMember"; readonly workspaceId: string }
  | { readonly _tag: "NoSuchWorkspace" }
  | { readonly _tag: "Failed"; readonly message: string };

export type AnswerOutcome = AnswerResult | { readonly _tag: "NotMember" } | { readonly _tag: "Failed"; readonly message: string };

export type AddHandleOutcome = AddHandleResult | { readonly _tag: "NotMember" } | { readonly _tag: "NotOwner" };

export type ConnectGitHubResult =
  | { readonly _tag: "Connected"; readonly connection: GitHubConnection }
  | { readonly _tag: "NotMember" }
  | { readonly _tag: "NotOwner" }
  | { readonly _tag: "Taken" }
  | { readonly _tag: "Failed"; readonly message: string };

/** For Sources, not people: the workspace an address names (`acme` of `launch.acme@co-worker.tech`). */
export type WorkspaceAt = (address: string) => Promise<WorkspaceApi | undefined>;
