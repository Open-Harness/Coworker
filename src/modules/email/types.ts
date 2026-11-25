import type { Mailer } from "~/modules/mail/types.ts";
import type { ManagerEntry } from "~/modules/workspace/types.ts";
import type { Channel, FileStore, Routed, Trigger } from "~/modules/triggers/types.ts";

/*
 * Email as a Source (model.md "Email, first class"). Every manager has an address, `launch.acme@co-worker.tech`;
 * every Task a reply address, `launch.acme+dt-14@…`. Inbound mail comes through Cloudflare Email Routing to the Worker's
 * `email()` handler; replies go out through the Mailer, threaded by `In-Reply-To` and `References`.
 */

/** What Email Routing hands the Worker, as far as this module reads it. */
export interface IncomingMail {
  /** The envelope sender and recipient. */
  readonly from: string;
  readonly to: string;
  readonly raw: ReadableStream<Uint8Array> | Uint8Array | string;
  readonly rawSize: number;
}

export type Received =
  | { readonly _tag: "Routed"; readonly routed: Routed }
  /** Refused at the door: Email Routing bounces it to the sender with this reason. */
  | { readonly _tag: "Rejected"; readonly reason: string }
  /** Taken in and dropped on purpose, with a line in Events: auto-replies, bounces, our own mail coming back. */
  | { readonly _tag: "Dropped"; readonly reason: string };

/** The workspace an address names, as far as email needs it. */
export interface Mailbox {
  readonly managers: () => Promise<readonly ManagerEntry[]>;
  readonly receive: (trigger: Trigger) => Promise<Routed>;
  readonly logEvent: (managerId: string, line: string) => Promise<void>;
}

export interface EmailDependencies {
  /** `co-worker.tech`: managers live at `<slug>.<workspace>@<mailDomain>`. */
  readonly mailDomain: string;
  /** What the app's own mail comes from. Mail from it is never a request. */
  readonly sendFrom: string;
  /** The largest message taken in, in bytes. */
  readonly maxBytes: number;
  /** The `authserv-id` whose `Authentication-Results` are trusted: the receiving MTA's own. */
  readonly authServId: string;
  readonly mailbox: (workspaceAddress: string) => Promise<Mailbox | undefined>;
  readonly files: FileStore;
  readonly now: () => number;
}

export interface EmailSource {
  readonly receive: (mail: IncomingMail) => Promise<Received>;
}

export interface Email {
  readonly source: (dependencies: EmailDependencies) => EmailSource;
  /** Replies on email Threads, from the manager's address, with the Task's reply address. */
  readonly channel: (mailer: Mailer) => Channel;
}
