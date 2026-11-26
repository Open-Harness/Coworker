import type { Change } from "~/modules/playbook/types.ts";

/* What it was told: notes and corrections, each with who said so. Pure. */

export interface Note {
  readonly id: string;
  readonly says: string;
  readonly by: string;
  readonly where: string;
  readonly at: number;
  /** A manager, or everyone below it when `tree`. Absent: the co-worker's own. */
  readonly for?: { readonly manager: string; readonly tree: boolean };
  /** Seen only by them: it came from a lent account or a private chat. */
  readonly private?: string;
  readonly tell: "always" | "when it fits";
  readonly used: number | null;
  readonly state: "proposed" | "kept" | "forgotten";
}

/** Someone put right what it did. */
export interface Correction {
  readonly by: string;
  readonly inside: boolean;
  readonly at: number;
  readonly where: string;
  readonly about: string;
  readonly did: string;
  readonly should: string;
}

export interface Proposed {
  readonly note?: Note;
  readonly change?: Change;
  readonly because: string;
}

export interface Knowledge {
  /** Notes an agent is told now: kept, for its manager or above, not private to someone else. Newest win where two say the same. */
  readonly tell: (
    notes: readonly Note[],
    to: { readonly manager: string; readonly above: readonly string[]; readonly speaksWith: readonly string[] },
  ) => readonly Note[];
  /** Only from someone in the workspace. From outside it is information, never a rule. */
  readonly mayPropose: (correction: Correction) => boolean;
  /** Two notes that say the opposite: both are shown and a person picks. */
  readonly clash: (notes: readonly Note[], next: Note) => readonly Note[];
  /** Nobody used it for 90 days: proposed to be forgotten. */
  readonly stale: (notes: readonly Note[], now: number) => readonly Note[];
}
