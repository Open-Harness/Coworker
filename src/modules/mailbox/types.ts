import type { Clock, Ids } from "~/modules/clock/types.ts";

/*
 * `coworker-mailbox`: the mailboxes of the live tier's two outside people, on the test domain itself. Its own Worker: literal
 * Email Routing rules bring it the mail of the two addresses, and an HTTP API with one bearer token lets the live runner
 * read that mail and write as them. It is not part of the product.
 *
 *   GET  /v1/boxes/<address>/messages?subject=<text>   the mail whose subject contains the text, newest first
 *   GET  /v1/boxes/<address>/messages/<uid>            one message's text
 *   POST /v1/boxes/<address>/send                      { to, subject, text } → 202 { id }
 *   GET  /v1/boxes/<address>/sent/<id>                 { messageId }, or 404 until it is known
 *
 * Cloudflare chooses a sent message's Message-ID and lets nobody set it, and its documents do not say that the id a send
 * returns is that header. So each message is also sent to its own writer, blind, marked with `COPY_HEADER`: the Message-ID
 * on the copy that comes back is the one other people see. The copy is not shown in the inbox.
 */

export const COPY_HEADER = "X-Mailbox-Copy";

/** Older mail is dropped. */
export const KEEP_MS = 7 * 24 * 60 * 60 * 1000;

export interface Summary {
  /** Later mail has a larger one. */
  readonly uid: number;
  readonly messageId: string | null;
  readonly inReplyTo: string | null;
  readonly from: string;
  readonly subject: string;
  /** When it arrived, ISO 8601. */
  readonly at: string;
}

export interface Arrived extends Omit<Summary, "uid" | "at"> {
  readonly text: string;
  /** The id of the send this is the copy of, when it says it is one. */
  readonly copyOf: string | null;
}

/** One address's mail: one Durable Object. */
export interface Box {
  readonly keep: (mail: Arrived) => Promise<void>;
  readonly list: (subject: string) => Promise<Summary[]>;
  /** The text of one message, or `null` when there is none. */
  readonly read: (uid: number) => Promise<string | null>;
  /** A message with this id is about to be sent. */
  readonly sending: (id: string) => Promise<void>;
  /** The Message-ID other people see on that message, or `null` while its copy has not come back. */
  readonly sent: (id: string) => Promise<string | null>;
}

export interface Outgoing {
  readonly from: string;
  readonly to: string;
  readonly bcc: string;
  readonly subject: string;
  readonly text: string;
  readonly headers: Readonly<Record<string, string>>;
}

export type Posted = { readonly _tag: "Posted" } | { readonly _tag: "Refused"; readonly reason: string };

/** The outside thing that sends. */
export type Post = (mail: Outgoing) => Promise<Posted>;

export interface MailboxDependencies {
  /** Without one, every request is refused. */
  readonly token: string | undefined;
  readonly domain: string;
  /** The only addresses that get mail or may send it. */
  readonly addresses: readonly string[];
  readonly box: (address: string) => Box;
  readonly post: Post;
  readonly ids: Ids;
}

/** What Email Routing hands over. */
export interface Incoming {
  readonly to: string;
  readonly raw: ReadableStream<Uint8Array>;
  readonly setReject: (reason: string) => void;
}

export interface Mailbox {
  readonly fetch: (request: Request) => Promise<Response>;
  readonly email: (incoming: Incoming) => Promise<void>;
}

export interface BoxDependencies {
  /** The object's own storage. */
  readonly sql: SqlStorage;
  readonly clock: Clock;
}

/** The two people's addresses on a domain. */
export const addressesOn = (domain: string): readonly [person: string, stranger: string] => [`person@${domain}`, `stranger@${domain}`];
