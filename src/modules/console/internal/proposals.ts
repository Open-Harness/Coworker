import type { Change, Line } from "~/modules/playbook/types.ts";
import type { Trial, Verdict } from "~/modules/trials/types.ts";

/** A change that was tried beside what is there, with both shown, waiting for a person to take it, unless it was made alone. */
export interface Proposal {
  readonly id: string;
  readonly of: Line;
  readonly title: string;
  readonly says: string;
  readonly change: Change;
  readonly trial: Trial;
  readonly verdict: Verdict;
  readonly at: number;
  /** Who is asked: the one who answers for the manager. */
  readonly to: string;
  readonly ask: string | null;
  readonly state: "open" | "taken" | "left";
}
