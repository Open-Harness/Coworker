import type { Check, Kind, Step } from "~/modules/playbook/types.ts";
import type { Mandate } from "~/modules/reach/types.ts";

/*
 * A piece of work, and the only place its state changes. `move` is pure: work and an event in, work and what to do
 * next out. Whoever holds it stores the one and does the other, in one transaction.
 */

export interface ThreadRef {
  readonly connector: string;
  readonly account: string;
  readonly place: string;
  /** `412` for an issue, a message id for a mail. */
  readonly id: string;
}

/** What shows that a check is true, and who looked. */
export interface Evidence {
  readonly check: string;
  readonly met: boolean;
  readonly says: string;
  readonly link?: string;
  readonly by: { readonly agent: string; readonly thread: string } | { readonly person: string } | { readonly code: true };
  readonly at: number;
}

/** What moves it on. Open work always has one, and it always has a date. */
export interface Next {
  readonly what: string;
  readonly who: "itself" | "ci" | "outside" | { readonly person: string } | { readonly manager: string };
  readonly by: number;
}

export type Ended = { readonly as: "done" | "no" | "dropped" | "stopped" | "handed over"; readonly why: string; readonly at: number };

export interface Work {
  readonly id: string;
  readonly manager: string;
  readonly kind: string;
  readonly version: number;
  readonly title: string;
  readonly about: string;
  /** Where it was asked, and where the answer goes. */
  readonly from: ThreadRef;
  readonly asked: string;
  readonly answers: string;
  readonly mandate: Mandate;
  readonly doneWhen: readonly Check[] | null;
  readonly evidence: readonly Evidence[];
  readonly step: string;
  /** How often each step sent it back. */
  readonly sentBack: Readonly<Record<string, number>>;
  readonly threads: readonly {
    readonly id: string;
    readonly agent: string;
    readonly role: "does" | "checks";
    readonly state: "working" | "ended";
  }[];
  readonly follows: readonly ThreadRef[];
  readonly next: Next | null;
  readonly waits: { readonly ask: string; readonly person: string } | null;
  /** It said so already, for this wait. */
  readonly chased: boolean;
  readonly cost: number;
  readonly ended: Ended | null;
  readonly order: number;
  readonly priority: "now" | "soon" | "later";
}

/** Everything that can happen to it. Each has a key: the same one twice changes nothing the second time. */
export type WorkEvent = { readonly key: string; readonly at: number } & (
  | { readonly is: "started"; readonly thread: string; readonly agent: string }
  | { readonly is: "said done when"; readonly checks: readonly Check[] }
  | {
      readonly is: "reported";
      readonly thread: string;
      readonly result: "done" | "no" | "stuck";
      readonly says: string;
      readonly evidence: readonly Evidence[];
    }
  | { readonly is: "unanswered"; readonly thread: string; readonly why: string }
  | { readonly is: "checked"; readonly thread: string; readonly evidence: readonly Evidence[]; readonly says: string }
  | { readonly is: "heard"; readonly from: ThreadRef; readonly event: string; readonly item: string }
  | { readonly is: "follows"; readonly thread: ThreadRef }
  | { readonly is: "asked"; readonly ask: string; readonly person: string; readonly by: number }
  | { readonly is: "answered"; readonly ask: string; readonly person: string; readonly answer: string }
  /** `person`: who, when `by` is `person`. It becomes the evidence's `by`. */
  | { readonly is: "passed"; readonly by: "ci" | "person" | "connector"; readonly check: string; readonly person?: string }
  | {
      readonly is: "failed";
      readonly by: "ci" | "person" | "connector";
      readonly check: string;
      readonly says: string;
      readonly person?: string;
    }
  | { readonly is: "finished outside"; readonly as: "done" | "no"; readonly says: string }
  | { readonly is: "due" }
  | { readonly is: "spent"; readonly cost: number; readonly over: "work" | "manager" | "workspace" | null }
  | { readonly is: "moved"; readonly person: string; readonly step: string }
  | { readonly is: "stopped"; readonly person: string; readonly why: string }
  | { readonly is: "opened again"; readonly person: string; readonly why: string }
  | { readonly is: "narrowed"; readonly mandate: Mandate }
  | { readonly is: "handed over"; readonly manager: string; readonly work: string }
);

/** What must be done now that it moved. Each is done once, under `key`. */
export type ToDo = { readonly key: string } & (
  | {
      readonly do: "start";
      readonly step: string;
      readonly agent: string;
      readonly role: "does" | "checks";
      readonly fresh: boolean;
      readonly brief: string;
    }
  | { readonly do: "tell thread"; readonly thread: string; readonly what: string }
  | {
      readonly do: "ask";
      readonly person: string;
      readonly need: "decide" | "approve" | "do" | "review";
      readonly question: string;
      readonly by: number;
    }
  | { readonly do: "say"; readonly where: ThreadRef; readonly text: string }
  | { readonly do: "wake"; readonly at: number }
  | { readonly do: "end threads" }
  | { readonly do: "end box" }
);

export type Moved =
  | { readonly _tag: "Moved"; readonly work: Work; readonly todo: readonly ToDo[] }
  /** Seen before: nothing changes. */
  | { readonly _tag: "Same"; readonly work: Work }
  | { readonly _tag: "Refused"; readonly why: string };

export interface NewWork {
  readonly id: string;
  readonly manager: string;
  readonly kind: Kind;
  readonly version: number;
  readonly title: string;
  readonly about: string;
  readonly from: ThreadRef;
  readonly asked: string;
  readonly answers: string;
  readonly mandate: Mandate;
  readonly at: number;
  /** No room now: it waits for a place, with a date. */
  readonly waits: boolean;
}

export interface Works {
  readonly take: (input: NewWork) => { readonly work: Work; readonly todo: readonly ToDo[] };
  readonly move: (work: Work, event: WorkEvent, kind: Kind) => Moved;
  /** The steps of a kind as a board's columns, with Triage first and Done last. */
  readonly columns: (kinds: readonly Kind[]) => readonly { readonly id: string; readonly name: string; readonly tip: string }[];
  readonly stepOf: (kind: Kind, work: Work) => Step | undefined;
  /** Every done-when has evidence that it is met, from someone who did not do it. */
  readonly isDone: (work: Work) => boolean;
  /** "Waits for Bo", "Waits for the customer", "Working". Never blocked or pending. */
  readonly says: (work: Work, names: Readonly<Record<string, string>>) => string;
}
