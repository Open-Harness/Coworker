import type { Lost, Standing, Worse } from "~/modules/measures/types.ts";
import type { Decision, Item } from "~/modules/intake/types.ts";
import type { Kind, Trigger } from "~/modules/playbook/types.ts";
import type { Mandate, Reach } from "~/modules/reach/types.ts";
import type { ThreadView } from "~/modules/threads/types.ts";
import type { Work } from "~/modules/work/types.ts";
import type { Person, Tile } from "~/modules/views-workspace/types.ts";

export type * from "./playbooks.ts";

/* What a manager's screens are given. Data, not words. */

export interface ManagerHead {
  readonly id: string;
  readonly name: string;
  readonly above: string | null;
  readonly is: "working" | "needs you" | "idle" | "stuck" | "paused";
  readonly now: string;
  readonly version: number;
}

export interface ManagerOverview {
  readonly head: ManagerHead;
  /** The person's own words, and the objective as the playbook states it. */
  readonly said: string;
  readonly says: string;
  readonly by: { readonly person: string; readonly at: number };
  readonly standing: Standing;
  /** What the chart counts, each week: "Good calls". */
  readonly unit: string;
  readonly brought: readonly { readonly kind: string; readonly points: readonly number[] }[];
  readonly measures: readonly {
    readonly counts: string;
    readonly read: string;
    readonly tile: Tile;
    readonly is: "good" | "behind" | "not yet";
    /** A result, or a guard that must not get worse. */
    readonly role: "result" | "guard";
    /** In the tile's unit, per `per` when it is a rate. `note`: a person's word for it ("their guess", "Unknown"). */
    readonly before: { readonly value: number | null; readonly note: string | null };
    readonly aim: {
      readonly value: number | null;
      readonly by: number | null;
      readonly limit: "at least" | "under" | null;
      readonly note: string | null;
    };
    readonly per: "week" | "month" | null;
    /** No number to show yet: from when, and why. */
    readonly notYet: { readonly from: number; readonly why: string } | null;
  }[];
  readonly worse: readonly Worse[];
  readonly lost: Lost;
  /** What Juno would change where it is lost, and what each step lost, by `lost.steps` in the same order. */
  readonly lostWhy: readonly {
    readonly because: readonly { readonly n: number; readonly what: string }[];
    readonly change: string | null;
  }[];
  /** When the tiles were read. */
  readonly readAt: number;
  readonly tiles: readonly Tile[];
  /** A tile with no number yet: when it will have one. */
  readonly tilesNotYet: readonly { readonly tile: string; readonly from: number }[];
  readonly connectors: readonly {
    readonly id: string;
    readonly name: string;
    readonly as: string;
    readonly works: boolean;
    readonly says: string;
    readonly in: number;
    readonly out: number;
  }[];
  /** Who it needs, newest first. `for`: the person it waits for, null when it is settled. */
  readonly rail: readonly {
    readonly tone: "wrong" | "waits" | "proposes" | "plain";
    readonly title: string;
    readonly text: string;
    readonly link: string;
    readonly for: string | null;
    readonly since: number;
  }[];
}

export interface IntakeRow {
  readonly item: Item;
  readonly decision: Decision;
  readonly work: { readonly id: string; readonly title: string } | null;
  readonly from: string;
  /** Found, let through, judged, taken on: each with when. */
  readonly line: readonly { readonly did: string; readonly says: string; readonly at: number }[];
  readonly said: "right" | "wrong" | null;
  /** The version each manager's kinds were judged under (spec I7). */
  readonly versions: Readonly<Record<string, number>>;
  /** The mandate it has, or would get on a yes: who allowed it and when, what it may not do, what it has spent. */
  readonly mandate: {
    readonly mandate: Mandate;
    readonly by: string;
    readonly at: number;
    readonly never: readonly string[];
    readonly spent: number | null;
  } | null;
}
export interface TriggerRow {
  readonly trigger: Trigger;
  readonly came: number;
  readonly took: number;
  readonly cost: number;
  readonly next: number | null;
  readonly from: string;
}
export interface IntakeView {
  readonly head: ManagerHead;
  readonly rows: readonly IntakeRow[];
  readonly triggers: readonly TriggerRow[];
  readonly kinds: readonly Kind[];
  readonly next: string | null;
}
export interface TriggerView {
  readonly row: TriggerRow;
  /** Names for what the trigger holds ids of. */
  readonly agentName: string;
  readonly kindName: string | null;
  /** What it looks at: "CRM list Target accounts", and how many things are in it. */
  readonly looksAt: { readonly says: string; readonly count: number; readonly noun: string } | null;
  readonly may: Reach;
  /** What it spent this month, of what it may. */
  readonly spent: { readonly month: number; readonly of: number };
  readonly steps: readonly { readonly does: string; readonly by: string; readonly says: string }[];
  readonly found: readonly {
    readonly title: string;
    readonly says: string;
    readonly from: string;
    readonly became: string;
    readonly at: number;
    readonly waits: boolean;
  }[];
  readonly runs: readonly { readonly at: number; readonly says: string; readonly cost: number }[];
  /** What it was run over to choose when it runs: how many past days, and what each way got. */
  readonly tried: readonly { readonly when: string; readonly says: string }[];
  readonly triedDays: number;
}

export interface Card {
  readonly work: Pick<Work, "id" | "title" | "about" | "kind" | "step" | "priority" | "order" | "cost" | "waits" | "next">;
  readonly kindName: string;
  readonly from: string;
  readonly says: string;
  readonly who: string;
  readonly links: readonly { readonly label: string; readonly link: string }[];
  readonly thread: string | null;
  readonly since: number;
  readonly doneWhen: { readonly met: number; readonly of: number };
}
export interface BoardView {
  readonly head: ManagerHead;
  /** All the open work, also what is not drawn as a card: and how much of it waits for someone outside, and for a person. */
  readonly totals: { readonly open: number; readonly outside: number; readonly person: number };
  readonly columns: readonly {
    readonly id: string;
    readonly name: string;
    readonly tip: string;
    readonly waits: boolean;
    readonly more: number;
  }[];
  readonly cards: readonly Card[];
}

export interface WorkView {
  readonly head: ManagerHead;
  readonly work: Work;
  readonly kindName: string;
  readonly stepName: string;
  /** Who answers for it: the manager until a person is chosen. */
  readonly answers: { readonly id: string; readonly name: string; readonly is: "manager" | "person" };
  readonly labels: readonly string[];
  /** People told when it moves. */
  readonly told: readonly Person[];
  /** What the three selectors offer. */
  readonly options: {
    readonly steps: readonly { readonly id: string; readonly name: string }[];
    readonly kinds: readonly { readonly id: string; readonly name: string }[];
    readonly answerers: readonly { readonly id: string; readonly name: string; readonly is: "manager" | "person" }[];
  };
  readonly asked: string;
  readonly from: string;
  readonly started: number;
  readonly limit: number | null;
  readonly attention: number;
  readonly approach: string;
  readonly threads: readonly (Pick<ThreadView, "id" | "agent" | "role" | "state" | "started" | "took" | "cost" | "brief"> & {
    /** What it was set to do, and what it said last. */
    readonly title: string;
    readonly said: string;
  })[];
  readonly links: readonly {
    readonly is: string;
    readonly id: string;
    readonly title: string;
    readonly says: string;
    readonly link: string;
  }[];
  readonly evidence: readonly {
    readonly name: string;
    readonly says: string;
    readonly size: string;
    readonly by: string;
    readonly link: string;
  }[];
  readonly activity: readonly { readonly who: string; readonly at: number; readonly text: string }[];
}

export interface ThreadsView {
  readonly head: ManagerHead;
  readonly rows: readonly (Omit<ThreadView, "lines" | "diff" | "files" | "brief" | "mayUse"> & {
    readonly title: string;
    readonly said: string;
    /** Messages in what it was forked from, when it was forked. */
    readonly knew: number;
  })[];
  /** The conversations the roots are forks of. `under` of a root is one of these. */
  readonly conversations: readonly { readonly id: string; readonly name: string; readonly work: string | null }[];
  readonly ended7: number;
  /** What the forks cost in 7 days: all of the manager's spend. */
  readonly cost7: number;
  readonly limits: readonly { readonly says: string; readonly is: string }[];
}
export interface ThreadPage {
  readonly head: ManagerHead;
  readonly thread: ThreadView;
  /** A call that has started and not finished. */
  readonly running: { readonly tool: string; readonly target: string } | null;
  /** What it did to each file it touched. */
  readonly touched: readonly { readonly path: string; readonly says: string }[];
  readonly work: { readonly id: string; readonly title: string } | null;
}
