import type { Objective } from "~/modules/playbook/types.ts";

/* Is it working: an objective's number, read where the manager cannot write, against its line. Pure. */

export interface Reading {
  readonly at: number;
  /** When what it counts happened. It counts once `settles` has passed. */
  readonly of: number;
  readonly value: number;
  readonly from: string;
}

export interface Point {
  readonly at: number;
  readonly value: number;
  readonly line: number;
}

export type Standing =
  | { readonly _tag: "NotYet"; readonly until: number; readonly why: string }
  | {
      readonly _tag: "Read";
      readonly now: number;
      readonly aim: number;
      /** Where the line is today. */
      readonly line: number;
      readonly is: "on its line" | "below its line" | "reached";
      readonly since: number;
      readonly before: number | null;
      readonly points: readonly Point[];
    };

export interface Worse {
  readonly counts: string;
  readonly now: number;
  readonly limit: number;
  readonly is: "fine" | "worse" | "not yet";
}

/** Where things are lost between coming in and the result. */
export interface Lost {
  readonly steps: readonly { readonly name: string; readonly in: number; readonly on: number }[];
  readonly most: string | null;
}

export interface Measures {
  /** From `before` at the start to the aim at its date, straight. */
  readonly line: (objective: Objective, start: number, at: number) => number;
  readonly standing: (objective: Objective, start: number, readings: readonly Reading[], now: number) => Standing;
  readonly worse: (objective: Objective, readings: Readonly<Record<string, readonly Reading[]>>, now: number) => readonly Worse[];
  readonly lost: (steps: Lost["steps"]) => Lost;
  /** Two weeks below its line: the co-worker looks. */
  readonly needsALook: (standing: Standing, now: number) => boolean;
  /** Why this may not be a measure: the manager may write what it reads. */
  readonly mayBe: (objective: Objective, mayWrite: readonly { readonly account: string; readonly field: string }[]) => string | null;
}
