import type { Change, Eval, Files, Line } from "~/modules/playbook/types.ts";

/* Getting better: cases, the weakest part, one change, tried beside what is there. Pure; running a case is `threads`. */

export interface Case {
  readonly id: string;
  readonly of: Line;
  readonly item: string;
  /** What came in, as it was. Nothing personal of other customers. */
  readonly given: string;
  readonly happened: string;
  readonly right: boolean;
  readonly saidBy: string;
  readonly from: "past" | "live" | "comment";
  /** Kept out of sight of what writes changes. */
  readonly held: boolean;
}

export interface CaseRun {
  readonly case: string;
  readonly version: "now" | "next";
  readonly time: number;
  readonly passed: boolean;
  readonly says: string;
  readonly cost: number;
}

export interface Score {
  readonly passed: number;
  readonly of: number;
  readonly cost: number;
  /** How far it moves by itself: the same version, the same cases, again. 0 to 1. */
  readonly spread: number;
}

export interface PartStanding {
  readonly eval: Eval;
  readonly now: number | null;
  /** How many live pieces of work it was on in 7 days. */
  readonly seen: number;
}

export interface Trial {
  readonly id: string;
  readonly of: Line;
  readonly says: string;
  readonly changes: readonly Change[];
  readonly now: Score;
  readonly next: Score;
  readonly differ: readonly { readonly case: string; readonly now: CaseRun; readonly next: CaseRun }[];
  readonly worse: readonly string[];
}

export type Verdict = { readonly keep: boolean; readonly why: string };

export interface Trials {
  readonly score: (runs: readonly CaseRun[]) => Score;
  /** Furthest below its line, for what it was seen on. Not yet read, or never seen: not it. */
  readonly weakest: (parts: readonly PartStanding[]) => PartStanding | undefined;
  /** Better by more than it varies by itself, nothing that passed fails twice, and no measure is worse. */
  readonly verdict: (trial: Omit<Trial, "id" | "says">) => Verdict;
  /** May the co-worker make this change without asking? Words, skills, models, cadences. Never steps, reach, evals or the objective. */
  readonly mayAlone: (now: Files, changes: readonly Change[]) => boolean;
  /** A craft skill earns its place: with it, the same cases come out better. */
  readonly skillStays: (withIt: Score, without: Score) => Verdict;
  /** A comment or a correction as the case it is. */
  readonly caseOf: (input: Omit<Case, "id" | "held">, existing: readonly Case[]) => Case;
  /** Half the cases of each part are held, and always the same ones. */
  readonly held: (cases: readonly Case[]) => readonly Case[];
  /** A model judge is used only where it agrees with the person: at least 20 of their judgements, and 9 in 10 the same. */
  readonly judgeAgrees: (pairs: readonly { readonly person: boolean; readonly model: boolean }[]) => Verdict;
}
