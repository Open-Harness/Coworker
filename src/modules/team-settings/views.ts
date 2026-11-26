import type { Loaded } from "~/modules/team-core/types.ts";
import type { AuditPage, Role } from "./types.ts";

/* What the screens that change one thing at a time show and send. Plain data: nothing here ever holds a secret. */

export interface ModelChoice {
  readonly connectionId: string;
  readonly model: string;
}
export interface ModelOption {
  readonly connectionId: string;
  readonly label: string;
  readonly models: readonly string[];
}

export interface GeneralData {
  readonly name: string;
  readonly address: string;
  /** What managers' addresses are on: `<manager>.<address>@<mailDomain>`. */
  readonly mailDomain: string;
  readonly region: "eu" | "us";
  readonly createdAt: number;
  readonly timeZone: string;
  readonly defaultModel: ModelChoice | null;
  readonly choices: readonly ModelOption[];
  readonly hasLogo: boolean;
  readonly role: Role;
}
export type SaveGeneral = Pick<GeneralData, "name" | "address" | "timeZone" | "defaultModel">;

export type Permission = "on" | "ask" | "off";
export interface ActionRow {
  readonly id: string;
  readonly category: string;
  readonly label: string;
}
export interface PermissionSet {
  readonly categories: Readonly<Record<string, Permission>>;
  readonly actions: Readonly<Record<string, Permission>>;
}
export interface RolesData {
  readonly presets: Readonly<Record<Role, PermissionSet>>;
  readonly categories: readonly string[];
  readonly actions: readonly ActionRow[];
  readonly mine: { readonly preset: Role; readonly own: PermissionSet };
}
export interface OwnChange {
  readonly scope: "category" | "action";
  readonly key: string;
  readonly value: Permission;
  readonly byName: string;
  readonly at: number;
}
export interface PersonPermissions {
  readonly person: string;
  readonly name: string;
  readonly email: string;
  readonly preset: Role;
  readonly changes: readonly OwnChange[];
}
export interface SetChange {
  readonly person: string;
  readonly scope: "category" | "action";
  readonly key: string;
  /** `null` takes the person's own change away, so the preset says again. */
  readonly value: Permission | null;
}

export interface BudgetData {
  readonly hours: number;
  readonly whenReached: "stop" | "tell";
}
export interface UsageData {
  readonly periodStart: number;
  readonly renewsAt: number;
  readonly hours: { readonly used: number; readonly included: number; readonly over: number };
  readonly overageCents: number;
  readonly perDay: readonly { readonly day: string; readonly hours: number }[];
  readonly runs: { readonly thisPeriod: number; readonly lastPeriod: number };
  readonly managers: readonly {
    readonly managerId: string;
    readonly name: string;
    readonly sandboxHours: number;
    readonly runs: number;
    readonly budget: BudgetData | null;
  }[];
}

/** What the audit log is narrowed to. A field left out does not narrow. */
export interface AuditFilters {
  readonly kind?: "person" | "manager";
  readonly manager?: string;
  readonly category?: string;
  readonly permission?: Permission;
  readonly outcome?: "done" | "refused" | "asked" | "failed";
  /** Milliseconds: nothing older. */
  readonly since?: number;
}

/** What the filter bar shows. `all` and `any` narrow nothing. */
export interface AuditControls {
  readonly kind: "all" | "person" | "manager";
  /** A manager's id, `workspace` for what happened to the workspace itself, or `all`. */
  readonly manager: string;
  readonly category: string;
  readonly permission: "any" | Permission;
  readonly outcome: "all" | "done" | "asked" | "refused" | "failed";
  readonly range: "all" | "1d" | "7d" | "30d";
}

/** What a test call said of a connection after it was tested, or after its key or address changed. */
export interface CheckData {
  readonly label: string;
  readonly works: boolean;
  readonly error?: string;
}

export interface SecretData {
  readonly name: string;
  readonly updatedAt: number;
}
export interface TestData {
  readonly ready: boolean;
  readonly output: string;
}

export interface ProfileData {
  readonly timeZone: string | null;
  readonly language: string;
  /** Local `HH:MM` on these days, 0 being Sunday. `null`: always. */
  readonly workingHours: { readonly days: readonly number[]; readonly from: string; readonly to: string } | null;
}
export interface NotificationData {
  readonly events: readonly { readonly event: string; readonly label: string; readonly email: boolean }[];
  readonly quietHours: boolean;
}
export interface MeData {
  readonly name: string;
  readonly email: string;
  readonly role: Role;
  readonly profile: ProfileData;
  readonly notifications: NotificationData;
}

export type SignInWay = "google" | "github";
/** One browser a person is signed in on. */
export interface SignInData {
  readonly id: string;
  /** What ends it. */
  readonly token: string;
  /** "Chrome on macOS". */
  readonly device: string;
  readonly at: number;
  readonly isThis: boolean;
}

/** A person's own account, which every workspace they are in shares. */
export interface AccountApi {
  readonly saveName: (name: string) => Promise<Loaded<true>>;
  /** What this deployment can sign in with, besides the email link. */
  readonly ways: () => Promise<Loaded<readonly SignInWay[]>>;
  readonly linked: () => Promise<Loaded<readonly SignInWay[]>>;
  /** The provider's page, which comes back to `returnTo`. */
  readonly link: (way: SignInWay, returnTo: string) => Promise<Loaded<string>>;
  /** Mails a link that proves the address. */
  readonly addEmail: (email: string) => Promise<Loaded<true>>;
  readonly signIns: () => Promise<Loaded<readonly SignInData[]>>;
  readonly signOutOf: (token: string) => Promise<Loaded<true>>;
  readonly signOutElsewhere: () => Promise<Loaded<true>>;
}

/** The routes that change one screen's settings. A refusal is the server's own words. */
export interface MoreApi {
  readonly general: (workspaceId: string) => Promise<Loaded<GeneralData>>;
  readonly saveGeneral: (workspaceId: string, input: SaveGeneral) => Promise<Loaded<true>>;
  readonly uploadLogo: (workspaceId: string, file: File) => Promise<Loaded<true>>;
  readonly removeLogo: (workspaceId: string) => Promise<Loaded<true>>;
  /** Where the logo and the export are, for an image and a download. */
  readonly logoUrl: (workspaceId: string, version: number) => string;
  readonly exportUrl: (workspaceId: string) => string;
  readonly roles: (workspaceId: string) => Promise<Loaded<RolesData>>;
  readonly permissions: (workspaceId: string) => Promise<Loaded<readonly PersonPermissions[]>>;
  readonly setChange: (workspaceId: string, change: SetChange) => Promise<Loaded<true>>;
  readonly usage: (workspaceId: string) => Promise<Loaded<UsageData>>;
  readonly setBudget: (workspaceId: string, managerId: string, budget: BudgetData | null) => Promise<Loaded<true>>;
  readonly managers: (workspaceId: string) => Promise<Loaded<Readonly<Record<string, string>>>>;
  readonly auditPage: (workspaceId: string, filters: AuditFilters, before?: string) => Promise<Loaded<AuditPage>>;
  readonly auditExportUrl: (workspaceId: string, filters: AuditFilters) => string;
  readonly recheckModel: (workspaceId: string, modelId: string) => Promise<Loaded<CheckData>>;
  readonly replaceKey: (workspaceId: string, modelId: string, key: string) => Promise<Loaded<CheckData>>;
  readonly editEndpoint: (
    workspaceId: string,
    modelId: string,
    edit: { readonly label: string; readonly baseUrl: string; readonly key?: string },
  ) => Promise<Loaded<CheckData>>;
  readonly removeModel: (workspaceId: string, modelId: string) => Promise<Loaded<true>>;
  readonly secrets: (workspaceId: string) => Promise<Loaded<readonly SecretData[]>>;
  /** Answers with the environments whose setup named it. */
  readonly removeSecret: (workspaceId: string, name: string) => Promise<Loaded<readonly string[]>>;
  /** Answers with the agents that left it. */
  readonly deleteEnvironment: (workspaceId: string, environmentId: string) => Promise<Loaded<readonly string[]>>;
  readonly testEnvironment: (workspaceId: string, environmentId: string) => Promise<Loaded<TestData>>;
  readonly agentNames: (workspaceId: string) => Promise<Loaded<readonly string[]>>;
  readonly me: (workspaceId: string) => Promise<Loaded<MeData>>;
  readonly saveProfile: (workspaceId: string, profile: ProfileData) => Promise<Loaded<true>>;
  readonly saveNotifications: (workspaceId: string, notifications: NotificationData) => Promise<Loaded<true>>;
}
