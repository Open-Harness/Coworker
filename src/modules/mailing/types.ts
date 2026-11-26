import type { Clock } from "~/modules/clock/types.ts";
import type { Item, OpenWork } from "~/modules/intake/types.ts";
import type { Mailer } from "~/modules/mail/types.ts";
import type { MailRecord, Mails, Told } from "~/modules/mail-events/types.ts";
import type { Duration } from "~/modules/playbook/types.ts";
import type { ConversationView, MailView } from "~/modules/views-connector/types.ts";
import type { WorkEvent } from "~/modules/work/types.ts";

/*
 * The workspace's mailbox: every mail that came in to its address and every mail it sent, kept as `mail-events` reads them. What a person
 * wrote is an item for intake (a mail, or a wait that came true); what became true of a conversation (it came back, they are away) is told to
 * the work that follows it; the pages of the mailbox are read from here; and what is written as the co-worker leaves from here, once.
 * Nothing is read from anywhere: what it keeps, who hears the mailbox and the mailer are given.
 */

/** What one call of the mailbox asks, by who and what. Every call is a plain value in, a plain value out. */
export type MailCall =
  /** A mail arrived. `server`: the one whose word on a sender counts. */
  | {
      readonly is: "hear";
      readonly raw: string | Uint8Array;
      readonly from: string;
      readonly to: string;
      readonly at: number;
      readonly server: string;
    }
  | { readonly is: "view" }
  | { readonly is: "conversation"; readonly id: string }
  /** Written as the co-worker by a person: it is theirs until they hand it back. */
  | { readonly is: "write"; readonly id: string; readonly text: string; readonly key: string; readonly person: string }
  | { readonly is: "hand back"; readonly id: string; readonly key: string; readonly person: string }
  /** A person tells the work that follows a conversation something. */
  | { readonly is: "tell"; readonly id: string; readonly text: string; readonly key: string; readonly person: string }
  /** A manager answers the last thing a person wrote in a conversation. `key`: the same one twice sends once. */
  | { readonly is: "reply"; readonly id: string; readonly text: string; readonly key: string; readonly by: string }
  | {
      readonly is: "send";
      readonly to: string;
      readonly subject: string;
      readonly text: string;
      readonly key: string;
      readonly by: string;
      readonly inside: boolean;
    }
  | { readonly is: "draft"; readonly id: string; readonly text: string; readonly key: string; readonly by: string }
  | { readonly is: "search"; readonly words: string };

export type MailAnswer =
  | { readonly is: "heard"; readonly heard: "Kept" | "Noise" | "Same" | "Broken"; readonly why: string }
  | { readonly is: "view"; readonly view: MailView }
  | { readonly is: "conversation"; readonly view: ConversationView | undefined }
  | { readonly is: "done"; readonly says: string; readonly id: string | null }
  /** Nothing was done and nothing will be by trying again. */
  | { readonly is: "refused"; readonly why: string }
  /** The mailer did not take it: try again. */
  | { readonly is: "failed"; readonly why: string }
  | { readonly is: "found"; readonly lines: readonly string[] };

/** What it keeps. Mails and what became true are kept once, by their ids; a note is a small fact by its key. */
export interface MailStore {
  readonly mails: () => Mails;
  readonly put: (mail: MailRecord) => void;
  readonly addNews: (news: readonly Told[], since: number) => void;
  readonly news: () => readonly { readonly told: Told; readonly since: number }[];
  readonly told: (key: string) => void;
  readonly note: (key: string) => string | undefined;
  readonly setNote: (key: string, value: string) => void;
}

/** A manager that hears the mailbox. */
export interface MailListener {
  readonly manager: string;
  readonly name: string;
  readonly paused: boolean;
  readonly open: () => Promise<readonly OpenWork[]>;
  readonly news: (input: { readonly work: string; readonly event: WorkEvent; readonly says?: string }) => Promise<void>;
  /** Its triggers that wait for quiet: `for` is how long. */
  readonly waits: () => Promise<readonly { readonly id: string; readonly name: string; readonly for: Duration }[]>;
}

export interface MailingDeps {
  readonly store: MailStore;
  readonly mailer: Mailer;
  readonly clock: Clock;
  /** The workspace's address for mail, and every address that is ours (what it sends from). */
  readonly mailbox: string;
  readonly addresses: readonly string[];
  /** The co-worker's name, as it signs. */
  readonly name: () => string;
  readonly listeners: () => Promise<readonly MailListener[]>;
  /** Keeps an item once by its `same`. `left`: it is not judged, and why. Answers whether it was new. */
  readonly keep: (item: Omit<Item, "id" | "trigger">, trigger: string, hears: readonly string[], left: string | null) => boolean;
  /** Who an address is in this workspace: the person it proves to be, if any. */
  readonly known: (address: string) => string | null;
}

export interface Mailing {
  readonly handle: (call: MailCall) => Promise<MailAnswer>;
  /** What became true is told to the work that follows it, and what quiet is owed is made. Answers when to come back, if something is owed. */
  readonly run: () => Promise<{ readonly again: number | null }>;
}
