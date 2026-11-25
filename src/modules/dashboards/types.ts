import type { ProgressView, TriggerDecision } from "~/modules/manager/types.ts";
import type { EventEntry, InboxItem } from "~/modules/workspace/types.ts";

/*
 * The numbers behind Home and a manager's Overview, counted on the server. Days are UTC, oldest first, thirty of them;
 * a screen shows the last seven or all thirty. Nothing here holds a transcript, a key or a person's words except the
 * titles of tasks and of Inbox items the person may already read.
 */

export const DAYS = 30;

/** What one manager contributes: its board's numbers, what it decided, and what its workspace heard for it. */
export interface ManagerFacts {
  readonly managerId: string;
  readonly name: string;
  readonly progress: ProgressView;
  readonly decisions: readonly TriggerDecision[];
  readonly events: readonly EventEntry[];
}

export interface DaySeries {
  /** `2026-11-24`, UTC, oldest first. */
  readonly days: readonly string[];
}

export interface EventsByOutcome {
  readonly accepted: readonly number[];
  readonly followup: readonly number[];
  readonly ignored: readonly number[];
  readonly waiting: readonly number[];
}

export interface HomeView extends DaySeries {
  /** False when the person's role may not read tasks: then only the rail and events are filled. */
  readonly canSeeTasks: boolean;
  readonly tiles: {
    readonly openTasks: number;
    readonly runningAgents: number;
    readonly waitingOnPeople: number;
    readonly needsYou: number;
  };
  readonly created: readonly number[];
  readonly finished: readonly number[];
  readonly events: EventsByOutcome;
  readonly managers: readonly {
    readonly managerId: string;
    readonly name: string;
    readonly openTasks: number;
    readonly runningAgents: number;
    readonly waitingOnPeople: number;
  }[];
  readonly needsYou: {
    readonly total: number;
    readonly items: readonly {
      readonly id: string;
      readonly title: string;
      readonly managerName: string;
      readonly kind: string;
      readonly createdAt: number;
    }[];
  };
}

export interface OverviewView extends DaySeries {
  readonly managerId: string;
  readonly name: string;
  readonly mission: string;
  readonly lanes: readonly { readonly id: string; readonly name: string; readonly count: number; readonly isDone: boolean }[];
  readonly totals: {
    readonly tasks: number;
    readonly open: number;
    readonly done: number;
    readonly runningAgents: number;
    readonly waitingOnPeople: number;
  };
  readonly created: readonly number[];
  readonly finished: readonly number[];
  /** Tasks still open at the end of each day. */
  readonly open: readonly number[];
  readonly blocked: readonly {
    readonly id: string;
    readonly title: string;
    readonly lane: string;
    readonly reason: string;
    readonly stage: string;
  }[];
  readonly agents: readonly { readonly agent: string; readonly tasks: number; readonly done: number; readonly running: number }[];
}

export interface Dashboards {
  home(input: {
    readonly now: number;
    readonly managers: readonly ManagerFacts[];
    readonly inbox: readonly InboxItem[];
    readonly canSeeTasks: boolean;
  }): HomeView;
  overview(input: { readonly now: number; readonly manager: ManagerFacts; readonly mission: string }): OverviewView;
  /** The first plain paragraph of a mission page, in one line, or empty. */
  missionLine(body: string): string;
}
