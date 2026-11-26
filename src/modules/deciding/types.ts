import type { Agent } from "~/modules/agent/types.ts";
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

/** Who a person chose, when two fit equally. */
export interface Chosen {
  readonly manager: string;
  readonly kind: string;
  /** The person, and their name. */
  readonly by: string;
  readonly name: string;
}

/** Two or more fit equally: a person is asked which, once. */
export interface AskWhich {
  readonly item: Item;
  /** Who is asked. */
  readonly to: string;
  readonly between: readonly { readonly manager: string; readonly name: string; readonly kind: string; readonly kindName: string }[];
  readonly why: string;
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
  readonly manager: (row: ManagerRow) => Pick<ManagerStoreApi, "hearing" | "take" | "heard" | "news">;
  /** One call to a model, through the loop's pi-ai seam: the judge. */
  readonly ask: Agent["ask"];
  /** Who this is where it came from: can they write to the repo, are they inside the mail domain. */
  readonly standing: (item: Item) => Promise<Actor["standing"]>;
  readonly clock: Clock;
  /** Does what was said answer an ask that was made on its thread? Then it is that answer, and not a new thing. */
  /** Asks a person which of those that fit equally takes an item. Asking twice for one item is one ask. */
  readonly askWhich?: (input: AskWhich) => Promise<void>;
  /** The one a person chose for an item, once they answered. */
  readonly chosen?: (item: Item) => Chosen | undefined;
  /** Is a person already asked which manager takes this item's conversation? The ask's id. */
  readonly asked?: (item: Item) => string | undefined;
  readonly answered?: (item: Item) => Promise<{ readonly ask: string; readonly work: string | null } | undefined>;
}

export interface Deciding {
  /** Decides everything that can be decided now. Answers when to come back, when something must be asked again. */
  readonly run: () => Promise<{ readonly again: number | null }>;
}
