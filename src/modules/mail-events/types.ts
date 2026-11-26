import type { WorkEvent } from "~/modules/work/types.ts";

/*
 * What a mail is, whose it really is, and what became of ours. A mail is a record that never changes, named by its
 * Message-ID; a conversation is worked out from all of them, in any order; what became of a mail we sent is worked out
 * from the reports that came back. Pure, but for reading a MIME message. Proved on real mail and real bounces.
 */

export interface Address {
  readonly address: string;
  readonly name: string;
}

/** What kind of mail it is. Only `person` and `invite` are ever somebody asking. */
export type MailIs =
  | "person"
  /** Someone is away: shown, and does not count as an answer. */
  | "away"
  /** It came back, is late, or was complained about: `reports` says which of ours. */
  | "report"
  | "list"
  /** Receipts, alerts, anything no person typed. */
  | "machine"
  | "invite";

export interface Report {
  readonly is: "failed" | "late" | "delivered" | "complained";
  /** Of which of ours: its Message-ID when the report has it. */
  readonly of: string | null;
  readonly to: string | null;
  /** `5.1.1`, when there is one. */
  readonly status: string | null;
  /**
   * Why it did not arrive. Only `no such address` is for good: a full mailbox is emptied, a refused mail (spam, size, rules) is
   * about the mail, and a server may answer tomorrow.
   */
  readonly why: "no such address" | "full" | "refused" | "no answer" | "unknown" | null;
  readonly says: string;
}

/** How sure it is that it is from who it says. */
export interface From {
  /** Signed or sent by the domain of `from`, or a domain above or below it that it belongs to. `false` is not proof of a lie. */
  readonly proven: boolean;
  readonly by: "dkim" | "dmarc" | null;
  /** Our own mail server said that it fails. */
  readonly refused: boolean;
}

export interface MailRecord {
  /** Its Message-ID. Without one, made from what it is, so that the same mail twice has the same. */
  readonly id: string;
  readonly is: MailIs;
  readonly from: Address;
  readonly replyTo: Address | null;
  readonly to: readonly Address[];
  readonly cc: readonly Address[];
  readonly subject: string;
  readonly at: number;
  readonly inReplyTo: string | null;
  readonly refs: readonly string[];
  /** What is new in it: without the mail it answers, and the signature. */
  readonly text: string;
  /** All of it, as text. From HTML when there is nothing else. */
  readonly whole: string;
  readonly proof: From;
  readonly reports: readonly Report[];
  readonly attachments: readonly { readonly name: string; readonly type: string; readonly size: number }[];
}

export type Read =
  | { readonly _tag: "Mail"; readonly mail: MailRecord; readonly bytes: readonly Uint8Array[] }
  | { readonly _tag: "Noise"; readonly why: string; readonly mail: MailRecord }
  | { readonly _tag: "Broken"; readonly why: string };

export interface Us {
  /** Every address that is ours: what it is sent to and from. */
  readonly addresses: readonly string[];
  /** The one server whose word on a sender counts. */
  readonly server: string;
}

/** All the mail of one mailbox, by id. Ours are those from one of our addresses. */
export type Mails = Readonly<Record<string, MailRecord>>;

/** What became of one of ours. `late` goes on to any of the others; `failed` and `complained` stay. */
export type Sent = "sent" | "late" | "delivered" | "failed" | "complained";

export interface Conversation {
  /** The oldest mail it is known to start with; an id that never came, if that is what the others answer. */
  readonly id: string;
  readonly mails: readonly string[];
  readonly people: readonly string[];
  /** Whose turn it is, by the last mail that a person or we wrote. */
  readonly waits: "us" | "them" | "nobody";
  readonly sent: Readonly<Record<string, Sent>>;
  /** Not to be written to again: there is no such address, or they complained. */
  readonly closedTo: readonly string[];
}

export type Told = { readonly key: string; readonly conversation: string; readonly at: number } & (
  | { readonly is: "wrote"; readonly mail: string }
  | { readonly is: "away"; readonly who: string; readonly says: string }
  | { readonly is: "came back"; readonly mail: string; readonly to: string | null; readonly forGood: boolean; readonly says: string }
  | { readonly is: "complained"; readonly mail: string; readonly to: string | null }
);

export interface MailEvents {
  /** One message as it arrived. Never throws. Ours coming back is noise. `envelope`: who it was sent by and to, outside the message. */
  readonly read: (
    raw: string | Uint8Array,
    envelope: { readonly from: string; readonly to: string; readonly at: number },
    us: Us,
  ) => Promise<Read>;
  /** Any order, any number of times: the same end. */
  readonly keep: (mails: Mails, mail: MailRecord) => Mails;
  readonly conversationOf: (mails: Mails, id: string, us: Us) => Conversation | undefined;
  readonly conversations: (mails: Mails, us: Us) => readonly Conversation[];
  /** What became true: nothing for a mail that was there, nothing for ours. */
  readonly told: (before: Mails, after: Mails, us: Us) => readonly Told[];
  /** The headers of an answer: whom it goes to (Reply-To over From; never us, never a list, never one it is closed to), Re: once, every reference. */
  readonly answer: (
    mails: Mails,
    to: string,
    us: Us,
  ) =>
    | {
        readonly _tag: "Answer";
        readonly to: readonly string[];
        readonly cc: readonly string[];
        readonly subject: string;
        readonly inReplyTo: string;
        readonly refs: readonly string[];
        readonly autoSubmitted: "auto-generated" | null;
      }
    | { readonly _tag: "No"; readonly why: string };
  readonly asWork: (told: Told, thread: { readonly account: string; readonly place: string }) => WorkEvent | undefined;
}
