import type { Clock, Ids } from "~/modules/clock/types.ts";
import type { Answered, Ask, Asked, NewAsk, Rule } from "~/modules/asks/types.ts";

/*
 * One way to ask a person, to take their answer from anywhere, to remind, and to go on: for whatever is asked, a question, an
 * action that waits for a yes, a limit that was reached, a model that stopped. What asked says how it goes on only to itself: it
 * is told "this was answered" with the ask's id, and does what it kept for that id. Here an ask is kept, shown, answered once,
 * reminded, and told to whoever asked until they have heard. The workspace's object keeps it (`AskStore`).
 */

/** One ask as it is kept, with what the inbox shows beside it. */
export interface Kept {
  readonly ask: Ask;
  /** Who asks: a manager's name. */
  readonly from: string;
  /** The kind of work, for "always for this kind". */
  readonly kind: string;
  /** Whose work it is, for "always for this person". */
  readonly person: string;
  readonly looked: readonly string[];
  readonly otherwise: string | null;
  readonly links: readonly { readonly label: string; readonly link: string }[];
  /** The answer has been told to whoever asked. Until it has, it is told again. */
  readonly told: boolean;
}

/** An ask, as whoever asks gives it. `id` is theirs: asking again with it finds the ask that is there. */
export interface OpenAsk {
  readonly ask: NewAsk;
  readonly from: string;
  readonly kind: string;
  readonly person: string;
  readonly looked: readonly string[];
  readonly otherwise: string | null;
  readonly links: readonly { readonly label: string; readonly link: string }[];
}

export interface Answerer {
  readonly id: string;
  readonly name: string;
  readonly role: "Owner" | "Builder" | "Member";
}

/** The way something is asked, and answered, from where it is. */
export type AskOp =
  | { readonly op: "open"; readonly input: OpenAsk }
  | { readonly op: "inbox"; readonly person: string }
  | {
      readonly op: "answer";
      readonly ask: string;
      readonly by: Answerer;
      readonly answer: string;
      readonly always?: "thread" | "person" | "kind";
    }
  /** What was asked is not asked any more: its work ended. */
  | { readonly op: "gone"; readonly work: string; readonly why: string; readonly ask?: string }
  /** Does a rule the person made ("always") say yes to this use of an action? */
  | {
      readonly op: "covered";
      readonly use: { readonly action: string; readonly thread: string; readonly person: string; readonly kind: string };
    };

export type AskAnswer =
  | { readonly op: "open"; readonly asked: Asked; readonly isNew: boolean }
  | { readonly op: "inbox"; readonly items: readonly Kept[] }
  | { readonly op: "answer"; readonly answered: Answered | { readonly _tag: "NoSuchAsk" } }
  | { readonly op: "gone" }
  | { readonly op: "covered"; readonly is: boolean };

/** What comes in on a thread, said by someone: it may be an answer. */
export interface Heard {
  /** `github:acme/web#412`. */
  readonly thread: string;
  readonly text: string;
  /** The workspace's person, when the address is proven to be one. */
  readonly person: string | null;
  readonly name: string;
  /** The place it came from says they may act there: for GitHub, they can write to the repo. */
  readonly mayAct: boolean;
}

/** What the workspace's object gives for keeping asks. Every call is one statement, and the caller wraps them. */
export interface AskStore {
  readonly get: (id: string) => Kept | undefined;
  readonly put: (kept: Kept) => void;
  readonly open: () => readonly Kept[];
  /** Answered, and not told to whoever asked. */
  readonly untold: () => readonly Kept[];
  readonly rules: () => readonly Rule[];
  readonly putRule: (rule: Rule) => void;
}

/** What it is given: where asks are kept, time, and how whoever asked is told. */
export interface AskingDeps {
  readonly store: AskStore;
  readonly clock: Clock;
  readonly ids: Ids;
  /** Tells whoever asked that it was answered. `false`: it could not be told now, and is tried again. */
  readonly tell: (kept: Kept) => Promise<boolean>;
}

export interface Asking {
  readonly handle: (op: AskOp) => Promise<AskAnswer>;
  /** An answer in a comment: the one ask of that thread it says an option of, once. `undefined`: it answers nothing. */
  readonly heard: (heard: Heard) => Promise<{ readonly ask: string; readonly work: string | null } | undefined>;
  /** What is due: reminders, stand-ins and what silence does, and answers not yet told. Answers when it is next due. */
  readonly tick: () => Promise<number | null>;
}
