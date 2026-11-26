import type { Worse } from "~/modules/measures/types.ts";
import type { AgentRole, Because, Change, Eval, Files, Line, Playbook, Problem, Skill, Version } from "~/modules/playbook/types.ts";
import type { Limits } from "~/modules/reach/types.ts";
import type { PartStanding, Trial } from "~/modules/trials/types.ts";
import type { Case10, Walkthrough } from "~/modules/walkthrough/types.ts";
import type { ModelChoice } from "~/modules/playbook/types.ts";
import type { Blank } from "~/modules/templates/types.ts";
import type { Person } from "~/modules/views-workspace/types.ts";
import type { ManagerHead, TriggerRow } from "./types.ts";

export interface Comment {
  readonly id: string;
  readonly on: Line;
  readonly part: PartName;
  readonly by: string;
  readonly at: number;
  readonly text: string;
  /** The words it is on, when it is on some of a line and not the whole. */
  readonly quote: string | null;
  readonly became:
    | { readonly _tag: "Open" }
    /** `case`: also kept as this case, for the part it is on. */
    | {
        readonly _tag: "Change";
        readonly change: Change;
        readonly says: string;
        readonly is: "offered" | "taken" | "left";
        readonly case: string | null;
      }
    | { readonly _tag: "Answer"; readonly text: string }
    | { readonly _tag: "Case"; readonly id: string; readonly text: string };
}
export type PartName = "Playbook" | "Objective" | "Workflow" | "Triggers" | "Agents" | "Skills" | "Reach" | "Evals";

/** A case a person judges, with what the part it teaches would do, and what was wrong when it was not right. */
export type JudgedCase = Case10 & { readonly of: Line; readonly why: string | null };

export interface PlaybookView {
  readonly head: ManagerHead | null;
  readonly draft: boolean;
  readonly playbook: Playbook;
  readonly files: Files;
  readonly version: number;
  readonly problems: readonly Problem[];
  readonly comments: readonly Comment[];
  readonly because: Readonly<Record<Line, Because>>;
  /** `now`: on the live work, or in a draft on the past work. `was`: where it began. `how`: who judges it, in words. */
  readonly evals: readonly (PartStanding & { readonly was: number | null; readonly how: string })[];
  /** `says`: what happens, for a person. `most`: the limit, in words, for the ones a limit of `atMost` cannot say. */
  readonly triggers: readonly (TriggerRow & { readonly says: string; readonly most: string })[];
  /** `shared`: another manager that has the same agent. */
  readonly agents: readonly {
    readonly agent: AgentRole;
    readonly model: string;
    readonly from: "agent" | "manager" | "workspace";
    readonly shared: string | null;
  }[];
  /**
   * Every skill it has, the page of the playbook first (`layer: "playbook"`, the page is its words). `of`: the lift is out of this many
   * cases, when it is a count. `left`: why a craft skill was left out. `also`: who else has the skill.
   */
  readonly skills: readonly (Skill & {
    readonly with: number | null;
    readonly without: number | null;
    readonly of: number | null;
    readonly by: readonly string[];
    readonly left: string | null;
    readonly also: readonly string[];
  })[];
  /** What each account is now, for the reach table. `person`: who it waits for. */
  readonly accounts: readonly {
    readonly account: string;
    readonly state: "works" | "read only" | "waits" | "built in";
    readonly person: string | null;
  }[];
  /** How many of 100 go on the first time, for each step as `workflow/<kind>/<step>`; `first`: when it began. */
  readonly steps: Readonly<Record<Line, { readonly first: number; readonly now: number; readonly line: number }>>;
  /** What each kind has done in 30 days, in words: "22 in 30 days, Bo said yes to 19". */
  readonly record: Readonly<Record<string, string>>;
  /** What must not get worse, as it is now. Empty in a draft. */
  readonly worse: readonly Worse[];
  readonly saidBy: { readonly person: string; readonly at: number };
  /** The ten cases that teach it most, and how many there are. */
  readonly cases: { readonly shown: readonly JudgedCase[]; readonly total: number };
  /** A draft is tried on this stretch of the past, sending nothing. */
  readonly past: { readonly from: number; readonly to: number } | null;
  readonly newer: { readonly template: string; readonly version: number; readonly changes: number } | null;
}
export interface VersionsView {
  /** `how`: "from 3 corrections", "proposed by Juno". `told`: what it did to open work. */
  readonly versions: readonly (Omit<Version, "files"> & { readonly changes: number; readonly told: string; readonly how: string | null })[];
}
export interface CompareView {
  readonly trial: Trial;
  readonly of: Eval;
  readonly names: { readonly now: string; readonly next: string };
  /** The cases where they differ, by what came. The other cases of `trial.now.of` came out the same. */
  readonly cases: readonly { readonly id: string; readonly what: string }[];
  /** Who says yes to it, and why that person. */
  readonly asks: { readonly person: string; readonly why: string };
  /** Minutes from found to ready, over all the cases. */
  readonly minutes: { readonly now: number; readonly next: number };
  /** What must not get worse, with each version's number. */
  readonly guards: readonly {
    readonly counts: string;
    readonly unit: string;
    readonly now: number;
    readonly next: number;
    readonly limit: number;
  }[];
}
export interface ManagerSettings {
  readonly head: ManagerHead;
  readonly answers: string;
  readonly people: readonly Person[];
  readonly model: ModelChoice;
  /** What `inherit` means: the workspace's model, and what it may spend a day for everyone. */
  readonly workspace: { readonly model: Exclude<ModelChoice, "inherit">; readonly perDay: number };
  readonly limits: Limits;
  /** Managers below it, by name, and what is open or running: what retiring it would touch. */
  readonly below: readonly string[];
  readonly running: number;
  readonly waiting: number;
  readonly openWork: number;
  readonly template: { readonly id: string; readonly name: string; readonly version: number } | null;
}
/** What a finding shows: bars of how many of a whole, plain words, or the same search tried at some speeds. */
export type Figure =
  | {
      readonly _tag: "Bars";
      readonly of: number;
      readonly rows: readonly { readonly label: string; readonly n: number; readonly note: string | null }[];
    }
  | { readonly _tag: "Said"; readonly text: string }
  | {
      readonly _tag: "Tries";
      readonly rows: readonly {
        readonly look: string;
        readonly finds: number;
        readonly late: number;
        readonly cost: number;
        readonly picked: boolean;
      }[];
    };
/** What it was tried on in the past, and what it would have done. */
export interface Tried {
  readonly from: number;
  readonly to: number;
  readonly came: number;
  readonly took: number;
  readonly asked: number;
  readonly watched: number;
  readonly left: number;
  readonly cost: number;
  /** Minutes of a person's day, as they were and as it would be. */
  readonly personNow: number;
  readonly personWould: number;
}
/** Setting one up: the walkthrough, and what its pages show that the walkthrough has no place for. */
export interface SetUpView {
  readonly walk: Walkthrough;
  /** The steps the set-up skill wrote for this one objective, in order: what each is called, said short, and said at its top. */
  readonly steps: readonly { readonly label: string; readonly about: string; readonly title: string; readonly lead: string }[];
  /** The objective said back so that it can be measured, once it can. */
  readonly heard: string | null;
  /** The skill that wrote the steps, and which version of it. */
  readonly writtenBy: { readonly skill: string; readonly version: number };
  /** For each question by id: its answers, which may be more than one, and which one Juno would pick. */
  readonly asked: Readonly<
    Record<
      string,
      {
        readonly many: boolean;
        readonly best: readonly string[];
        readonly options: readonly { readonly id: string; readonly label: string; readonly about: string | null }[];
      }
    >
  >;
  /** For each of `walk.wants` in order: its name, who had it already, who must sign in. */
  readonly looks: readonly { readonly name: string; readonly had: string | null; readonly signs: string | null }[];
  /** What each finding shows, by its id. */
  readonly figures: Readonly<Record<string, Figure>>;
  /** The draft so far, part by part, and whether this step changed it. */
  readonly sofar: readonly { readonly part: string; readonly says: string; readonly isNew: boolean }[];
  readonly tried: Tried | null;
  /** The draft as the playbook's pages show it, once there is one. */
  readonly draft: PlaybookView | null;
}
/** What is found at a place: what the repo is, how to run it, what was tried and what cannot be done. */
export interface Found {
  readonly repo: { readonly name: string; readonly language: string; readonly open: number; readonly merged90: number };
  readonly install: string;
  readonly test: string;
  /** Milliseconds: reading the repo, and running its tests once in a copy of its own. */
  readonly took: { readonly read: number; readonly ran: number };
  readonly ran: { readonly passed: number; readonly skipped: number; readonly failed: number };
  readonly cannot: readonly string[];
  readonly notSure: readonly string[];
}
export interface FillView {
  readonly template: string;
  readonly name: string;
  /** `picks`: the places or people to choose from, with a line about each. */
  readonly blanks: readonly (Blank & { readonly picks: readonly { readonly id: string; readonly about: string | null }[] })[];
  readonly found: Found | null;
}
