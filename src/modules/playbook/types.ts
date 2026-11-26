import type { ActionId, Limits, Permission } from "~/modules/reach/types.ts";

/*
 * A playbook: how a manager works, all of it, as files. Pure: files in, a playbook or problems out. The shapes of the
 * files are in README.md, with an example of each in `docs/templates`.
 */

/** `workflow.yaml`, `agents/writer.md`, `skills/short-mail/SKILL.md`. */
export type Path = string;
export type Files = Readonly<Record<Path, string>>;
/** One thing in a playbook, by name: `workflow/bug/write`, `agents/writer/told`, `page/How I work`. */
export type Line = string;

export type Cadence = { readonly cron: string; readonly zone: string };
/** `4h`, `3d`, `45m`. */
export type Duration = string;

export interface Measure {
  /** "Calls that took place, with a company that fits". */
  readonly counts: string;
  readonly unit: string;
  readonly better: "more" | "less";
  readonly read:
    | { readonly from: "connector"; readonly account: string; readonly query: string }
    | { readonly from: "person"; readonly person: string; readonly asks: string };
  /** How long until a result counts. */
  readonly settles: Duration;
  readonly before: { readonly value: number; readonly at: string } | { readonly unknown: string };
}

export interface Objective {
  /** The person's own words. */
  readonly said: string;
  readonly measure: Measure;
  readonly aim: { readonly value: number; readonly by: string };
  readonly notWorse: readonly { readonly measure: Measure; readonly limit: number }[];
  /** Who is asked when it and something else pull apart. */
  readonly owner: string;
}

/** Something that must be true. `by` is how it is looked at: a command in the box, a fresh agent, a person, or what a connector says. */
export interface Check {
  readonly id: string;
  readonly says: string;
  readonly by: "command" | "agent" | "person" | "connector";
  readonly run?: string;
}

export interface Step {
  readonly id: string;
  readonly name: string;
  readonly by: { readonly agent: string } | { readonly person: string } | { readonly manager: true };
  readonly does: string;
  readonly skills: readonly string[];
  /** What must be true to go on, and who looks. Never who did it. */
  readonly leaves: readonly Check[];
  readonly checkedBy: { readonly agent: string } | { readonly person: string } | { readonly code: true };
  readonly otherwise:
    | { readonly back: string; readonly times: number; readonly then: { readonly ask: string } | { readonly drop: string } }
    | { readonly ask: string }
    | { readonly drop: string };
}

export interface Kind {
  readonly id: string;
  readonly name: string;
  /** In words. A model judges it. */
  readonly when: string;
  /** Work nobody asked for. Asked-for work always starts. */
  readonly alone: "off" | "watch" | "ask" | "do";
  readonly steps: readonly Step[];
  readonly doneWhen: readonly Check[];
  readonly may: readonly { readonly account: string; readonly place: string; readonly may: Readonly<Record<ActionId, Permission>> }[];
  readonly limits: Limits;
  /** Quiet this long, it looks again. */
  readonly look: Duration;
}

export type Trigger = {
  readonly id: string;
  readonly name: string;
  readonly on: boolean;
  /** The kind it makes, or `tells`: it only tells open work. */
  readonly makes: { readonly kind: string } | { readonly kinds: "any" } | "tells";
  readonly only: string;
  readonly atMost: { readonly a: "day" | "week"; readonly count: number } | "no limit";
} & (
  | {
      readonly by: "cron";
      readonly when: Cadence;
      readonly agent: string;
      readonly brief: string;
      readonly finds: readonly string[];
      readonly same: readonly string[];
    }
  | { readonly by: "event"; readonly account: string; readonly place: string; readonly events: readonly string[] }
  | { readonly by: "wait"; readonly for: Duration; readonly of: string; readonly holds: string; readonly account: string }
  | { readonly by: "asked"; readonly where: string }
);

export type Thinking = "off" | "low" | "medium" | "high";
/** A connected model, or the one above's. A template always says `inherit`. */
export type ModelChoice = { readonly connection: string; readonly model: string; readonly thinking: Thinking } | "inherit";

export interface AgentRole {
  readonly id: string;
  readonly name: string;
  readonly is: string;
  readonly told: string;
  readonly skills: readonly string[];
  /** Base tools by name, and connector actions as `github.comment`. */
  readonly tools: readonly string[];
  readonly model: ModelChoice;
}

export interface Skill {
  readonly id: string;
  readonly name: string;
  readonly layer: "harness" | "connector" | "craft" | "playbook";
  readonly says: string;
  /** `here`: the files are in this playbook. Otherwise it names one that is there already. */
  readonly from: "here" | "library" | "connector" | "harness";
}

/** Whose words count as asking, per place. Code, no model. */
export interface AskRule {
  readonly account: string;
  readonly place: string;
  readonly listed: { readonly who: readonly string[] } | { readonly who: "team" | "writers" };
  readonly others: "asked" | "maybe" | "no";
  readonly overheard: "maybe" | "no";
  readonly bots: readonly string[];
}

export interface ReachFile {
  readonly grants: Kind["may"];
  readonly limits: Limits;
  readonly mayAsk: readonly AskRule[];
  readonly never: readonly string[];
}

export interface Eval {
  readonly id: string;
  /** `workflow/bug/write`, `agents/writer`, `skills/bos-voice`, `triggers/signs`, `playbook`. */
  readonly of: Line;
  readonly good: string;
  readonly judge: "code" | { readonly person: string } | { readonly model: string; readonly agreesWith: string };
  readonly cases: readonly string[];
  readonly line: { readonly value: number; readonly unit: string };
}

export interface Because {
  readonly why: "you said" | "looked up" | "my idea";
  readonly by?: string;
  readonly where?: string;
}

export interface Playbook {
  readonly name: string;
  /** SKILL.md, without its front matter. */
  readonly page: string;
  readonly objective: Objective;
  readonly kinds: readonly Kind[];
  readonly triggers: readonly Trigger[];
  readonly agents: readonly AgentRole[];
  readonly skills: readonly Skill[];
  readonly skillFiles: Files;
  readonly reach: ReachFile;
  readonly evals: readonly Eval[];
  readonly because: Readonly<Record<Line, Because>>;
}

/** `at`: the file, and the line in it or the name of the thing. `says`: what is wrong, for a person. */
export interface Problem {
  readonly at: Path;
  readonly line?: Line;
  readonly says: string;
}

export type ReadPlaybook =
  | { readonly _tag: "Playbook"; readonly playbook: Playbook }
  | { readonly _tag: "Problems"; readonly problems: readonly Problem[] };

/** What is there around a playbook, to check it against. */
export interface Surroundings {
  readonly people: readonly string[];
  readonly accounts: readonly { readonly id: string; readonly actions: readonly ActionId[]; readonly events: readonly string[] }[];
  readonly skills: readonly string[];
  readonly tools: readonly string[];
  readonly models: readonly { readonly connection: string; readonly model: string }[];
  /** The reach of the manager above. */
  readonly above: { readonly grants: ReachFile["grants"]; readonly limits: Limits };
}

/** One thing that is different. `line` names it, so a comment, a suggestion and a diff speak of the same thing. */
export interface Change {
  readonly line: Line;
  readonly was: string | null;
  readonly becomes: string | null;
}

export interface Version {
  readonly number: number;
  readonly files: Files;
  readonly by: string;
  readonly at: number;
  readonly says: string;
  readonly from: "made" | "edited" | "suggestion" | "went back";
}

/** Two changes to the same line since `base`: both are shown, neither is lost. */
export interface Clash {
  readonly line: Line;
  readonly base: string | null;
  readonly theirs: string | null;
  readonly yours: string | null;
}

export type Merged = { readonly _tag: "Merged"; readonly files: Files } | { readonly _tag: "Clash"; readonly clashes: readonly Clash[] };

export interface Playbooks {
  readonly read: (files: Files) => ReadPlaybook;
  /** `read(write(p))` is `p`. */
  readonly write: (playbook: Playbook) => Files;
  /** What code can say about it. Empty: it can be made. */
  readonly check: (playbook: Playbook, around: Surroundings) => readonly Problem[];
  /** Every line of it, in reading order, with its text. What can be commented on. */
  readonly lines: (playbook: Playbook) => readonly { readonly line: Line; readonly text: string }[];
  readonly diff: (now: Files, next: Files) => readonly Change[];
  /** A suggestion taken on. A change whose `was` is no longer there is refused. */
  readonly apply: (files: Files, changes: readonly Change[]) => ReadPlaybook;
  readonly merge: (base: Files, theirs: Files, yours: Files) => Merged;
}
