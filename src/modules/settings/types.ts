import type { ActionRecord, By, Permission, PermissionSet } from "~/modules/actions/types.ts";
import type { AgentConfig } from "~/modules/agents/types.ts";
import type { Account } from "~/modules/billing/types.ts";
import type { Clock, Ids } from "~/modules/clock/types.ts";
import type { Mailer } from "~/modules/mail/types.ts";
import type { ManagerApi } from "~/modules/manager/types.ts";
import type { ModelConnection, Models } from "~/modules/models/types.ts";
import type { Sandboxes } from "~/modules/sandboxes/types.ts";
import type { Policy } from "~/modules/triggers/types.ts";
import type { SecretInfo, Vault } from "~/modules/vault/types.ts";
import type {
  AgentView,
  BudgetView,
  GeneralView,
  Invalid,
  ModelChoice,
  NotFound,
  NoticeEvent,
  NotificationView,
  PersonChange,
  ProfileView,
  Saved,
  SkillFiles,
  SkillView,
  UsageView,
} from "./views.ts";

/*
 * What the Settings screens change in a workspace, kept in the Workspace object. Every call is made on behalf of one
 * person (`By`), checked by the caller against their role, and leaves one line in the audit log. Nothing here ever
 * returns a secret: keys are read only inside `vault.use`.
 */

export interface RosterEntry {
  readonly managerId: string;
  readonly name: string;
  readonly slug: string;
  readonly address: string;
  readonly template: string;
  readonly objectId: string;
  readonly region: "eu" | "us";
}

/** What the module needs of its Workspace object. */
export interface SettingsPlace {
  readonly sql: SqlStorage;
  readonly clock: Clock;
  readonly ids: Ids;
  readonly profile: {
    readonly workspaceId: string;
    readonly name: string;
    readonly address: string;
    readonly region: string;
    readonly createdAt: number;
  };
  readonly mailDomain: string;
  readonly vault: Vault;
  readonly models: Models;
  readonly sandboxes: Sandboxes;
  readonly account: Account;
  readonly mailer: Mailer;
  /** The address the workspace's own mail is sent from. */
  readonly sendFrom: string;
  readonly roster: readonly RosterEntry[];
  readonly manager: (entry: RosterEntry) => ManagerApi;
  /** One line in the audit log; `managerId` is empty for the workspace itself. */
  readonly audit: (record: ActionRecord, managerId?: string) => void;
  /** Changes the profile's name and address, and every manager's address with it. */
  readonly rename: (name: string, address: string) => Promise<void>;
  /** An Inbox notice that only needs reading, once per `id`. */
  readonly notice: (notice: { readonly id: string; readonly to: string; readonly title: string }) => void;
  /** What only the Workspace knows of itself and is fit to export, by file: its people, its policies, its audit log. */
  readonly extras: () => Promise<Readonly<Record<string, unknown>>>;
  /** The person a manager answers to: who made it. */
  readonly ownerOf: (managerId: string) => string | undefined;
}

export type * from "./views.ts";

/** Every call takes its input and who is asking. `null` for no input. */
export interface SettingsApi {
  general(input: null, by: By): Promise<GeneralView>;
  setGeneral(
    input: { readonly timeZone?: string; readonly defaultModel?: ModelChoice | null },
    by: By,
  ): Promise<Saved<GeneralView> | Invalid>;
  rename(input: { readonly name: string; readonly address: string }, by: By): Promise<{ readonly _tag: "Renamed" }>;
  logo(
    input: null,
    by: By,
  ): Promise<{ readonly _tag: "Logo"; readonly type: string; readonly bytes: Uint8Array } | { readonly _tag: "None" }>;
  setLogo(
    input: { readonly bytes: Uint8Array },
    by: By,
  ): Promise<{ readonly _tag: "Saved" } | { readonly _tag: "TooLarge"; readonly limit: number } | { readonly _tag: "WrongType" }>;
  removeLogo(input: null, by: By): Promise<{ readonly _tag: "Removed" }>;
  exportAll(
    input: { readonly members: readonly { readonly name: string; readonly email: string; readonly role: string }[] },
    by: By,
  ): Promise<{ readonly _tag: "Exported"; readonly name: string; readonly bytes: Uint8Array }>;
  /** An Owner took the audit log away as a file. The log itself says so. */
  auditExported(input: { readonly lines: number }, by: By): Promise<{ readonly _tag: "Noted" }>;
  changes(input: null, by: By): Promise<readonly PersonChange[]>;
  ownOf(input: { readonly person: string }, by: By): Promise<PermissionSet>;
  setChange(
    input: { readonly person: string; readonly scope: "category" | "action"; readonly key: string; readonly value: Permission | null },
    by: By,
  ): Promise<{ readonly _tag: "Set"; readonly changes: readonly PersonChange[] } | Invalid>;
  profile(input: { readonly person: string }, by: By): Promise<ProfileView>;
  setProfile(input: { readonly person: string } & Partial<ProfileView>, by: By): Promise<Saved<ProfileView> | Invalid>;
  notifications(input: { readonly person: string }, by: By): Promise<NotificationView>;
  setNotifications(
    input: { readonly person: string; readonly email?: Readonly<Partial<Record<NoticeEvent, boolean>>>; readonly quietHours?: boolean },
    by: By,
  ): Promise<Saved<NotificationView> | Invalid>;
  /** Mails a person an Inbox item if they asked for it by email. Called when the item is made. */
  deliver(
    input: { readonly id: string; readonly kind: NoticeEvent; readonly to: string; readonly title: string; readonly from: string },
    by: By,
  ): Promise<{ readonly _tag: "Offered" }>;
  /** A manager's policy was changed: one audit line for each change, worded as the matching catalogue action words it. */
  policyChanged(
    input: { readonly managerId: string; readonly before: Policy; readonly after: Policy },
    by: By,
  ): Promise<{ readonly _tag: "Noted"; readonly lines: number }>;
  /** A mail from a manager's own address to the person who asked, to show the address works. */
  testMail(
    input: { readonly managerId: string; readonly to: string },
    by: By,
  ): Promise<{ readonly _tag: "Sent"; readonly from: string } | Invalid | NotFound>;
  usage(input: null, by: By): Promise<UsageView>;
  setBudget(
    input: { readonly managerId: string; readonly budget: BudgetView | null },
    by: By,
  ): Promise<Saved<UsageView> | Invalid | NotFound>;
  recheckModel(
    input: { readonly id: string },
    by: By,
  ): Promise<{ readonly _tag: "Checked"; readonly connection: ModelConnection } | NotFound>;
  replaceModelKey(
    input: { readonly id: string; readonly key: string },
    by: By,
  ): Promise<{ readonly _tag: "Replaced"; readonly connection: ModelConnection } | Invalid | NotFound>;
  editEndpoint(
    input: { readonly id: string; readonly label?: string; readonly baseUrl?: string; readonly key?: string },
    by: By,
  ): Promise<{ readonly _tag: "Edited"; readonly connection: ModelConnection } | Invalid | NotFound>;
  removeModel(input: { readonly id: string }, by: By): Promise<{ readonly _tag: "Removed" } | NotFound>;
  secretNames(input: null, by: By): Promise<readonly SecretInfo[]>;
  removeSecret(
    input: { readonly name: string },
    by: By,
  ): Promise<{ readonly _tag: "Removed"; readonly usedBy: readonly string[] } | Invalid | NotFound>;
  deleteEnvironment(
    input: { readonly id: string },
    by: By,
  ): Promise<{ readonly _tag: "Deleted"; readonly agents: readonly string[] } | NotFound>;
  testEnvironment(
    input: { readonly id: string },
    by: By,
  ): Promise<
    | { readonly _tag: "Tested"; readonly ready: boolean; readonly output: string }
    | { readonly _tag: "Unavailable"; readonly reason: string }
    | NotFound
  >;
  agents(input: null, by: By): Promise<readonly AgentView[]>;
  saveAgent(
    input: { readonly id?: string; readonly config: AgentConfig; readonly note?: string },
    by: By,
  ): Promise<Saved<AgentView> | Invalid | NotFound | { readonly _tag: "NameTaken" }>;
  /** Where an agent runs, from the Environments screen: a new version of a saved one, or the plain Worker's. */
  assignEnvironment(
    input: { readonly agent: string; readonly environment: string | null },
    by: By,
  ): Promise<{ readonly _tag: "Assigned" } | Invalid | { readonly _tag: "NoSuchAgent" } | { readonly _tag: "NoSuchEnvironment" }>;
  deleteAgent(input: { readonly id: string }, by: By): Promise<{ readonly _tag: "Deleted" } | NotFound>;
  skills(input: null, by: By): Promise<readonly SkillView[]>;
  saveSkill(
    input: { readonly id?: string; readonly name: string; readonly files: SkillFiles; readonly note?: string },
    by: By,
  ): Promise<Saved<SkillView> | Invalid | NotFound | { readonly _tag: "NameTaken" }>;
  deleteSkill(input: { readonly id: string }, by: By): Promise<{ readonly _tag: "Deleted" } | Invalid | NotFound>;
}

export type SettingsName = keyof SettingsApi;
export type SettingsInput<K extends SettingsName> = Parameters<SettingsApi[K]>[0];
export type SettingsOutput<K extends SettingsName> = Awaited<ReturnType<SettingsApi[K]>>;

/**
 * One call as it crosses to the Workspace object. The object's RPC takes this plain union, not a generic, because a
 * generic method cannot be typed through a stub; `callSettings` gives the caller the typed answer back.
 */
export type SettingsCall = { [K in SettingsName]: { readonly name: K; readonly input: SettingsInput<K> } }[SettingsName];
export type SettingsResult = { [K in SettingsName]: SettingsOutput<K> }[SettingsName];
