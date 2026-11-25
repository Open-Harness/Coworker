import type { Loaded } from "~/modules/team-core/types.ts";

/*
 * Home and a manager's Overview: what the server counted (the dashboards module), narrowed. Days are UTC, oldest first,
 * thirty of them; a screen shows the last seven or all thirty.
 */

export type Range = "7d" | "30d";

export interface EventsByOutcome {
  readonly accepted: readonly number[];
  readonly followup: readonly number[];
  readonly ignored: readonly number[];
  readonly waiting: readonly number[];
}

export interface HomeManager {
  readonly managerId: string;
  readonly name: string;
  readonly openTasks: number;
  readonly runningAgents: number;
  readonly waitingOnPeople: number;
}

export interface NeedsYouItem {
  readonly id: string;
  readonly title: string;
  readonly managerName: string;
  readonly kind: "approval" | "question";
  readonly createdAt: number;
}

export interface HomeData {
  readonly days: readonly string[];
  /** False when the person's role may not read tasks: then there are no task numbers to show. */
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
  readonly managers: readonly HomeManager[];
  readonly needsYou: { readonly total: number; readonly items: readonly NeedsYouItem[] };
}

export interface OverviewData {
  readonly days: readonly string[];
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
  readonly open: readonly number[];
  readonly blocked: readonly { readonly id: string; readonly title: string; readonly lane: string; readonly reason: string }[];
  readonly agents: readonly { readonly agent: string; readonly tasks: number; readonly done: number; readonly running: number }[];
}

/** The screens' line to the server: both read-only. */
export interface HomeApi {
  readonly home: (workspaceId: string) => Promise<Loaded<HomeData>>;
  readonly overview: (workspaceId: string, managerId: string) => Promise<Loaded<OverviewData>>;
}
