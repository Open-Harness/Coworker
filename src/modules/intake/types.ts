import type { AskRule, Kind } from "~/modules/playbook/types.ts";
import type { Mandate, Reach } from "~/modules/reach/types.ts";

/*
 * What came in, and what became of it. Three parts in this order: `gate` (code), `judge` (a model that can only read,
 * asked with `question` and read back with `verdicts`), `decide` (code). The model never grants anything. Pure.
 */

export interface Actor {
  /** `github:5001`, `mail:pat@northwind.example`, `manager:docs`, `code:cron`. */
  readonly address: string;
  readonly name: string;
  readonly bot: boolean;
  /** The workspace's person this address is proven to be, if any. */
  readonly person?: string;
  /** What the connector said about them when asked: `write` on the repo, `inside` the mail domain. */
  readonly standing?: "admin" | "write" | "read" | "inside" | "outside";
}

/** Something that came in: kept once, unchanged. */
export interface Item {
  readonly id: string;
  readonly trigger: string;
  readonly by: "cron" | "event" | "wait" | "asked";
  readonly account: string;
  readonly place: string;
  /** The conversation it belongs to: `github:acme/web#412`. */
  readonly thread: string;
  readonly event: string;
  readonly actor: Actor;
  /** Did it speak to the co-worker: a mention, its label, a mail to its address, a direct message? */
  readonly addressed: boolean;
  readonly at: number;
  readonly title: string;
  readonly text: string;
  /** The same thing twice has the same key. */
  readonly same: string;
}

export interface Gated {
  readonly let: "asked" | "maybe" | "no";
  readonly why: string;
}

/** A manager that hears the place an item came from. */
export interface Hears {
  readonly manager: string;
  readonly name: string;
  readonly version: number;
  readonly paused: boolean;
  readonly mayAsk: readonly AskRule[];
  readonly kinds: readonly Kind[];
  readonly reach: Reach;
  readonly open: number;
  /** Of what the limits allow, what is spent: 0 to 1. */
  readonly spent: number;
}

export interface OpenWork {
  readonly id: string;
  readonly manager: string;
  /** The id of its kind, so that a kind's own `limits.atOnce` can be counted. */
  readonly kind: string;
  readonly title: string;
  readonly follows: readonly string[];
}

/** One kind of one manager, judged. Also the noes. */
export interface Verdict {
  readonly manager: string;
  readonly kind: string;
  readonly is: boolean;
  readonly why: string;
  /** 0 to 1. Two within 0.1 fit equally. */
  readonly fit: number;
}

export interface Judged {
  readonly verdicts: readonly Verdict[];
  /** It is about work that is open already. */
  readonly joins?: string;
}

export type Judgement = { readonly _tag: "Judged"; readonly judged: Judged } | { readonly _tag: "CouldNot"; readonly why: string };

export type Decision = {
  readonly item: string;
  readonly gated: readonly { readonly manager: string; readonly gated: Gated }[];
  readonly verdicts: readonly Verdict[];
  readonly why: string;
} & (
  | {
      readonly _tag: "Took";
      readonly manager: string;
      readonly kind: string;
      readonly version: number;
      readonly mandate: Mandate;
      readonly waits: boolean;
    }
  | { readonly _tag: "Joined"; readonly work: string }
  | { readonly _tag: "Left"; readonly would?: { readonly manager: string; readonly kind: string } }
  | { readonly _tag: "Asked"; readonly between: readonly { readonly manager: string; readonly kind: string }[] }
  | { readonly _tag: "Stopped"; readonly work: string }
  | { readonly _tag: "CouldNot" }
);

export interface DecideInput {
  readonly item: Item;
  readonly hears: readonly Hears[];
  readonly open: readonly OpenWork[];
  /** Absent: nothing was judged, because nothing had to be. */
  readonly judgement?: Judgement;
  readonly now: number;
}

/** How often a kind was corrected lately, newest last. */
export type Corrections = readonly ("right" | "wrong")[];

export interface Intake {
  readonly gate: (item: Item, rules: readonly AskRule[]) => Gated;
  /** Follows open work, says stop, or nobody lets it in: decided without a model. */
  readonly settled: (input: Omit<DecideInput, "judgement">) => Decision | undefined;
  /** What the judge is told. Its words come from the playbooks; the item's are marked as from outside. */
  readonly question: (item: Item, hears: readonly Hears[], open: readonly OpenWork[]) => { readonly system: string; readonly user: string };
  /** What the judge's `judge` call said, narrowed. A kind or a work that is not there is not a verdict. */
  readonly verdicts: (called: unknown, hears: readonly Hears[], open: readonly OpenWork[]) => Judgement;
  readonly decide: (input: DecideInput) => Decision;
  /** After a correction: two wrong in a row sends a kind that does or asks back a step. */
  readonly afterCorrection: (alone: Kind["alone"], corrections: Corrections) => Kind["alone"];
  /** Ten right in a row, and never wrong in the last twenty: what it may be widened to, proposed and never done. */
  readonly mayWiden: (alone: Kind["alone"], corrections: Corrections) => Kind["alone"] | undefined;
}
