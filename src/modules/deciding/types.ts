import type { Call, Models } from "~/modules/completion/types.ts";
import type { Clock } from "~/modules/clock/types.ts";
import type { ManagerRow } from "~/modules/console/types.ts";
import type { Actor, Decision, Item } from "~/modules/intake/types.ts";
import type { ManagerStoreApi } from "~/modules/manager-store/types.ts";

/*
 * What came in is decided, in order, one at a time: found out who may ask (a connector says), judged if nothing settles it, and handed to the
 * manager that takes it, or to the work that follows it. What a judge decides is kept with the item. A judge that did not answer is asked
 * again later, and the item waits; it is never decided in its absence.
 */

/** What is kept of what came in: one row each, in the order they arrived. */
export interface Pending {
  readonly item: Item;
  /** The managers that hear its place. */
  readonly hears: readonly string[];
}

export interface DecidingStore {
  /** Items with no decision yet, or whose judge did not answer and whose time to ask again has come. Oldest first. */
  readonly pending: (now: number) => readonly Pending[];
  readonly managers: () => readonly ManagerRow[];
  /** `retry`: when to try again, for a judge that did not answer. */
  readonly decided: (item: string, decision: Decision, retry: number | null) => void;
}

export interface DecidingDeps {
  readonly store: DecidingStore;
  readonly manager: (row: ManagerRow) => Pick<ManagerStoreApi, "hearing" | "take" | "heard">;
  /** What the workspace's models are, and a call to one of them made with its credential. */
  readonly models: () => Promise<Models>;
  readonly call: Call;
  /** Who this is where it came from: can they write to the repo, are they inside the mail domain. */
  readonly standing: (item: Item) => Promise<Actor["standing"]>;
  readonly clock: Clock;
}

export interface Deciding {
  /** Decides everything that can be decided now. Answers when to come back, when something must be asked again. */
  readonly run: () => Promise<{ readonly again: number | null }>;
}
