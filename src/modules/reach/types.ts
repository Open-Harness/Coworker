/*
 * How far something may go. One shape at every level: a manager's reach, a piece of work's mandate, an agent's part.
 * Each is a part of the one it was made from, and never more. Pure: nothing here reads or writes anything.
 */

export type Permission = "on" | "ask" | "off";
/** `github.comment`. The connector, a dot, what it does. */
export type ActionId = string;
/** Where a grant counts: `acme/web`, `#sales`, `*` for every place of that account. */
export type Place = string;

/** What may be done with one account, in one place. An action that is not listed is off. */
export interface Grant {
  readonly account: string;
  readonly place: Place;
  readonly may: Readonly<Record<ActionId, Permission>>;
}

/** Money in dollars, time in hours. Absent: no limit of its own, so the one above counts. */
export interface Limits {
  readonly perWork?: number;
  readonly perDay?: number;
  readonly perMonth?: number;
  readonly hours?: number;
  /** Pieces of work open at once. */
  readonly atOnce?: number;
}

export interface Reach {
  readonly grants: readonly Grant[];
  readonly limits: Limits;
}

/** The part of a reach one piece of work has. What it allows never changes; it can only be narrowed or end. */
export interface Mandate extends Reach {
  /** `asked`: someone who may ask did. `found`: the manager took it on by itself. */
  readonly strength: "asked" | "found";
  /** Who asked, or the kind that allowed it. */
  readonly because: { readonly by: "person"; readonly id: string } | { readonly by: "kind"; readonly kind: string };
  /** The playbook version it was made under. */
  readonly version: number;
  readonly until?: number;
  readonly state: "holds" | "stopped" | "taken back";
}

/** Why a part is wider than what it is a part of, one sentence each. */
export type Wider = readonly string[];

export type HandedOn = { readonly _tag: "Handed"; readonly reach: Reach } | { readonly _tag: "Wider"; readonly why: Wider };

export interface Use {
  readonly action: ActionId;
  readonly account: string;
  readonly place: string;
  readonly at: number;
}

/** What has been spent so far against the same limits. */
export interface Spent {
  readonly work: number;
  readonly day: number;
  readonly month: number;
  readonly hours: number;
}

export type Allowed = { readonly is: Permission; readonly why: string };

export interface Reaches {
  /** What of `part` is not in `whole`: an account, a place, an action, a stronger permission, a higher limit. Empty: it fits. */
  readonly wider: (whole: Reach, part: Reach) => Wider;
  /** The only way to make a smaller reach. A wider one is an answer, never a smaller one made silently. */
  readonly handOn: (whole: Reach, part: Reach) => HandedOn;
  /** A kind's part of a reach, as a mandate. Anything the kind asks beyond the reach is left out, and said. */
  readonly mandate: (
    whole: Reach,
    part: Reach,
    given: Pick<Mandate, "strength" | "because" | "version" | "until">,
  ) => { readonly mandate: Mandate; readonly leftOut: Wider };
  /** The reach above changed: the mandate, narrowed to what is still there. Never wider than it was. */
  readonly narrow: (mandate: Mandate, whole: Reach) => Mandate;
  /** May this be done, now? A limit that is reached turns on and ask into ask, and says which. */
  readonly allowed: (mandate: Mandate, use: Use, spent: Spent) => Allowed;
}
