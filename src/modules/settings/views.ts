import type { Permission } from "~/modules/actions/types.ts";
import type { AgentConfig } from "~/modules/agents/types.ts";

/** What the Settings screens show and save: plain data, safe to send to a page. */

export type NotFound = { readonly _tag: "NotFound" };
export type Invalid = { readonly _tag: "Invalid"; readonly reason: string };

export interface ModelChoice {
  readonly connectionId: string;
  readonly model: string;
}
export interface ModelOption {
  readonly connectionId: string;
  readonly label: string;
  readonly models: readonly string[];
}

export interface GeneralView {
  readonly workspaceId: string;
  readonly name: string;
  readonly address: string;
  /** What managers' addresses are on: `<manager>.<address>@<mailDomain>`. */
  readonly mailDomain: string;
  readonly region: string;
  readonly createdAt: number;
  readonly timeZone: string;
  readonly defaultModel: ModelChoice | null;
  readonly choices: readonly ModelOption[];
  readonly hasLogo: boolean;
}

/** One thing an Owner changed for one person, over their preset. */
export interface PersonChange {
  readonly person: string;
  readonly scope: "category" | "action";
  readonly key: string;
  readonly value: Permission;
  readonly by: string;
  readonly byName: string;
  readonly at: number;
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export interface ProfileView {
  readonly timeZone: string | null;
  readonly language: string;
  /** Local `HH:MM` times on these days, 0 being Sunday. Absent: always. */
  readonly workingHours: { readonly days: readonly Weekday[]; readonly from: string; readonly to: string } | null;
}

/** What a workspace sends a person: a question for them, an approval to give, a notice to read. */
export type NoticeEvent = "question" | "approval" | "notice";
export interface NotificationView {
  readonly events: readonly { readonly event: NoticeEvent; readonly label: string; readonly email: boolean }[];
  /** No email outside working hours. The Inbox still has everything. */
  readonly quietHours: boolean;
}

export type WhenReached = "stop" | "tell";
export interface BudgetView {
  readonly hours: number;
  readonly whenReached: WhenReached;
}

export interface UsageView {
  readonly periodStart: number;
  readonly renewsAt: number;
  readonly sandbox: {
    readonly hours: { readonly used: number; readonly included: number; readonly over: number };
    readonly overageCents: number;
  };
  readonly perDay: readonly { readonly day: string; readonly hours: number }[];
  readonly managers: readonly {
    readonly managerId: string;
    readonly name: string;
    readonly sandboxHours: number;
    readonly runs: number;
    readonly budget: BudgetView | null;
  }[];
  readonly runs: { readonly thisPeriod: number; readonly lastPeriod: number };
}

export interface VersionStamp {
  readonly version: number;
  readonly savedAt: number;
  readonly savedBy: string;
  readonly note: string;
}
export interface AgentView {
  readonly id: string;
  readonly config: AgentConfig;
  readonly version: number;
  readonly versions: readonly VersionStamp[];
}

export type SkillFiles = Readonly<Record<string, string>>;
export interface SkillCheck {
  readonly level: "ok" | "warn" | "error";
  readonly text: string;
}
export interface SkillView {
  readonly id: string;
  readonly name: string;
  readonly files: SkillFiles;
  readonly version: number;
  readonly checks: readonly SkillCheck[];
  readonly versions: readonly VersionStamp[];
}

export type Saved<T> = { readonly _tag: "Saved"; readonly value: T };
