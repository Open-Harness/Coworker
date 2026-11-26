import type { AccountState, ConnectorId } from "~/modules/connectors/types.ts";
import type { Role } from "~/modules/doings/types.ts";
import type { McpServer } from "~/modules/mcp/types.ts";
import type { ModelOn } from "~/modules/choosing/types.ts";
import type { AgentRole, ModelChoice, Skill, Thinking } from "~/modules/playbook/types.ts";
import type { Person } from "./types.ts";

export interface GeneralView {
  readonly name: string;
  readonly address: string;
  readonly zone: string;
  readonly perDay: number;
  readonly tellAt: number;
  readonly mayMake: boolean;
  readonly mayTry: boolean;
  readonly mayJoin: boolean;
}
export interface MembersView {
  readonly people: readonly (Person & {
    readonly mails: readonly string[];
    readonly known: readonly { readonly connector: string; readonly as: string }[];
    readonly lastSeen: number | null;
  })[];
  /** `name`: what whoever invited them called them; it is theirs once they have signed in. `at`: when invited. */
  readonly invited: readonly {
    readonly id: string;
    readonly name: string | null;
    readonly mail: string;
    readonly role: Role;
    readonly at: number;
    readonly until: number;
  }[];
  readonly wantIn: readonly { readonly id: string; readonly name: string; readonly mail: string; readonly at: number }[];
}
export interface KeysView {
  readonly models: readonly {
    readonly id: string;
    readonly label: string;
    readonly source: string;
    readonly works: boolean;
    readonly says: string;
    /** When its key was last tried. */
    readonly checked: number;
    readonly models: readonly (ModelOn & { readonly name: string; readonly levels: readonly Thinking[] })[];
  }[];
  readonly choice: ModelChoice | null;
  /** Names only. A value is never in an answer. `of`: what it is for; `usedAt`: the last time a call opened it. */
  readonly secrets: readonly {
    readonly name: string;
    readonly of: string;
    readonly usedBy: readonly string[];
    readonly set: number;
    readonly usedAt: number;
  }[];
}
export interface UsageView {
  readonly days: readonly { readonly day: number; readonly cost: number; readonly boxes: number }[];
  readonly managers: readonly { readonly id: string; readonly name: string; readonly cost: number }[];
  readonly models: readonly { readonly model: string; readonly cost: number; readonly notKnown: number }[];
  readonly perDay: number;
  readonly tellAt: number;
}
export interface AuditView {
  readonly lines: readonly {
    readonly id: string;
    readonly at: number;
    readonly by: string;
    readonly coworker: boolean;
    readonly kind: "person" | "coworker" | "manager";
    readonly says: string;
    readonly permission: "on" | "ask" | "off";
    /** What allowed it: a grant of a manager's reach, what the co-worker may do, or a person's role. */
    readonly under: { readonly is: "reach" | "may do" | "role"; readonly says: string };
    readonly approvedBy: string | null;
    readonly outcome: "done" | "refused" | "asked" | "failed";
    /** What went wrong, when `outcome` is not done. */
    readonly why: string | null;
    readonly group: string;
  }[];
  readonly next: string | null;
}
export interface BillingView {
  readonly plan: string;
  readonly people: number;
  readonly perPerson: number;
  readonly boxHours: { readonly used: number; readonly included: number; readonly overPerHour: number };
  readonly nextInvoice: number;
  /** Invited and not signed in yet: not counted. */
  readonly notCounted: readonly string[];
  readonly invoices: readonly {
    readonly id: string;
    readonly at: number;
    readonly amount: number;
    readonly paid: boolean;
    /** What it is for: a month, or part of one. */
    readonly period: { readonly from: number; readonly to: number };
    readonly people: number;
  }[];
}
export interface ConnectorsView {
  /** Each connector there is, with what it is for in a line, whether or not it has an account. */
  readonly connectors: readonly { readonly id: ConnectorId; readonly name: string; readonly what: string }[];
  readonly accounts: readonly (AccountState & {
    readonly name: string;
    /** Where it reaches, said: the repos, the channels, the domain. */
    readonly scope: string;
    readonly usedBy: readonly { readonly id: string; readonly name: string }[];
    readonly in7Days: number;
    readonly lastUsed: number;
    /** What it may do there on its own, and what it asks first, as the reach says them. */
    readonly may: string;
    readonly asks: string;
  })[];
}
/** Connecting GitHub in steps that check themselves. `installed`: null until a person has installed the app on GitHub. */
export interface ConnectGithubView {
  readonly installed: { readonly on: string; readonly by: string } | null;
  /** The repos the app can see on GitHub, once it is installed, and the ones chosen. */
  readonly repos: readonly { readonly id: string; readonly about: string }[];
  readonly chosen: readonly string[];
  /** What the app must be allowed to do; `missing` until a person allows it on GitHub. */
  readonly abilities: readonly { readonly id: string; readonly does: string; readonly needs: string; readonly missing: boolean }[];
}
export interface McpView {
  readonly servers: readonly (McpServer & { readonly by: string; readonly added: number })[];
}
export interface SharedView {
  readonly agents: readonly (AgentRole & {
    /** Where it was saved from, and who saved it. */
    readonly from: string;
    readonly saved: { readonly by: string; readonly at: number };
    /** Managers that use it. */
    readonly usedBy: readonly string[];
    readonly version: number;
    /** How it is judged: what counts, what it was at first, what it is now, and the line. Shares, or counts when `of`. */
    readonly measure: {
      readonly counts: string;
      readonly first: number;
      readonly now: number;
      readonly line: number;
      readonly of: number | null;
    };
  })[];
  readonly skills: readonly (Skill & {
    /** The manager whose playbook it was made in, when it was made for one. */
    readonly madeFor: string | null;
    /** `manager: agent` for each. */
    readonly usedBy: readonly { readonly manager: string; readonly agent: string }[];
    readonly version: number;
    /** The share of the same cases that come out right without it and with it. `of`: they are counted, out of this many. */
    readonly comparison: { readonly without: number; readonly with: number; readonly of: number | null } | null;
    /** It changed nothing, so it was left out. */
    readonly cut: boolean;
    readonly files: readonly { readonly name: string; readonly text: string }[];
    readonly versions: readonly { readonly n: number; readonly at: number | null; readonly by: string; readonly says: string }[];
    readonly cases: readonly { readonly what: string; readonly without: string; readonly with: string }[];
  })[];
  readonly environments: readonly {
    readonly id: string;
    readonly name: string;
    readonly about: string;
    readonly usedBy: readonly string[];
    readonly size: string;
    readonly setUp: string;
    readonly secrets: readonly { readonly name: string; readonly changed: number }[];
    readonly starts: readonly { readonly at: number; readonly took: number; readonly ok: boolean; readonly why: string | null }[];
  }[];
}
export interface MeView {
  readonly name: string;
  readonly mails: readonly { readonly mail: string; readonly proven: boolean }[];
  readonly zone: string;
  readonly tell: Readonly<Record<string, readonly ("inbox" | "mail" | "slack")[]>>;
  /** When the week is written, as a day of the week (1 is Monday) and a time. */
  readonly weekAt: { readonly day: number; readonly at: string };
  readonly quiet: { readonly from: string; readonly to: string; readonly unlessWrong: boolean } | null;
  /** How they can sign in, and which of them are set up. */
  readonly ways: readonly { readonly id: "mail" | "google" | "github"; readonly about: string }[];
  readonly sessions: readonly { readonly id: string; readonly says: string; readonly at: number; readonly here: boolean }[];
}
