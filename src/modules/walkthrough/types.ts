import type { Because, Files, Line, Objective } from "~/modules/playbook/types.ts";

/* Setting up a manager from what someone says. The steps and what may happen in them; the words are the set-up skill's. Pure. */

export interface Question {
  readonly id: string;
  readonly ask: string;
  readonly picks: readonly string[];
  readonly best: string;
  readonly because: string;
  /** The lines its answer would change. None: it may not be asked. */
  readonly changes: readonly Line[];
}

export interface Finding {
  readonly id: string;
  readonly says: string;
  readonly from: string;
  readonly wrong: string | null;
}

export interface Wants {
  readonly connector: string;
  readonly reads: string;
  readonly tells: string;
  readonly without: string;
  readonly state: "asked" | "connected" | "skipped" | "ended";
}

export interface Case10 {
  readonly id: string;
  readonly what: string;
  readonly would: string;
  readonly happened: string;
  readonly said: "right" | "wrong" | null;
}

export type Stage =
  | "said"
  | "first questions"
  | "connect"
  | "found"
  | "second questions"
  | "draft"
  | "made"
  | "thrown away"
  | "carried by another";

export interface Walkthrough {
  readonly id: string;
  readonly by: string;
  readonly stage: Stage;
  readonly said: string;
  readonly objective: Objective | null;
  readonly rounds: readonly { readonly questions: readonly Question[]; readonly answers: Readonly<Record<string, string>> }[];
  readonly wants: readonly Wants[];
  readonly findings: readonly Finding[];
  readonly draft: Files | null;
  readonly cases: readonly Case10[];
  readonly made: string | null;
}

export type WalkEvent =
  | { readonly is: "measured"; readonly objective: Objective }
  | { readonly is: "could carry"; readonly manager: string; readonly change: string }
  | { readonly is: "asks"; readonly questions: readonly Question[] }
  | { readonly is: "answers"; readonly by: string; readonly answers: Readonly<Record<string, string>> }
  | { readonly is: "wants"; readonly wants: readonly Omit<Wants, "state">[] }
  | { readonly is: "connected" | "skipped"; readonly connector: string }
  | { readonly is: "found"; readonly findings: readonly Omit<Finding, "wrong">[] }
  | { readonly is: "that is wrong"; readonly finding: string; readonly says: string }
  | { readonly is: "drafted"; readonly draft: Files; readonly cases: readonly Omit<Case10, "said">[] }
  | { readonly is: "edited"; readonly draft: Files; readonly lines: readonly Line[]; readonly by: string }
  | { readonly is: "judged"; readonly case: string; readonly said: "right" | "wrong" }
  | { readonly is: "make it"; readonly by: string }
  | { readonly is: "throw away"; readonly by: string };

export type Walked =
  | {
      readonly _tag: "Walked";
      readonly walk: Walkthrough;
      readonly does: readonly ("end read access" | "make manager" | "read the past" | "draft")[];
    }
  | { readonly _tag: "Refused"; readonly why: string };

export interface Walkthroughs {
  readonly start: (id: string, by: string, said: string) => Walkthrough;
  /** At most three questions a round, two rounds, none that changes no line; nothing made before ten cases are judged and a yes. */
  readonly walk: (walkthrough: Walkthrough, event: WalkEvent) => Walked;
  /** An answer nobody gave is the best one. */
  readonly answered: (walkthrough: Walkthrough) => Readonly<Record<string, string>>;
  /** Every line of the draft, with why it is there: a person's edit is `you said`. */
  readonly because: (walkthrough: Walkthrough) => Readonly<Record<Line, Because>>;
  /** How good the set-up skill was: lines nobody changed, questions whose answer changed nothing. */
  readonly score: (walkthrough: Walkthrough) => { readonly kept: number; readonly of: number; readonly idle: readonly string[] };
}
