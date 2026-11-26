/*
 * The outside people of the live tier (book section 2, "A person on email" and "A person on GitHub"): clients behind
 * interfaces, so a live test says what the person does and the adapter says how that provider lets it be done.
 *
 *   MailPerson   a mailbox of the `coworker-mailbox` Worker (the mailbox module), over its HTTP API. Cloudflare chooses a sent
 *                message's Message-ID, so it is read off the copy that comes back; replies are found by polling the inbox.
 *   GitPerson    a GitHub machine user whose fine-grained token reaches one repo (the REST API).
 */

export interface SentMail {
  readonly subject: string;
  /** The Message-ID other people see on it. */
  readonly messageId: string;
}

export interface ReceivedMail {
  /** The message's number in its mailbox: later mail has a larger one. */
  readonly uid: number;
  readonly messageId: string | null;
  readonly inReplyTo: string | null;
  readonly from: string;
  readonly subject: string;
  readonly at: string;
}

export type MailFailure = { readonly _tag: "Failed"; readonly reason: string };

export interface MailPerson {
  readonly address: string;
  /** Sends from this mailbox and waits until its Message-ID is known. */
  readonly send: (input: { readonly to: string; readonly subject: string; readonly text: string }) => Promise<SentMail | MailFailure>;
  /** What is in the inbox whose subject contains `subject`, newest first. */
  readonly inbox: (subject: string) => Promise<readonly ReceivedMail[] | MailFailure>;
  /** The text of one inbox message. */
  readonly read: (uid: number) => Promise<string | MailFailure>;
}

export interface IssueRef {
  readonly repo: string;
  readonly number: number;
  readonly url: string;
}

export interface IssueComment {
  readonly id: number;
  readonly body: string;
  /** `User` for a person, `Bot` for an App. */
  readonly authorType: string;
  readonly author: string;
}

export interface GitPerson {
  readonly openIssue: (repo: string, title: string, body: string) => Promise<IssueRef | MailFailure>;
  readonly comments: (issue: IssueRef) => Promise<readonly IssueComment[] | MailFailure>;
  readonly close: (issue: IssueRef) => Promise<void>;
  /** Who the token is: the GitHub user id the manager's allowed list names. */
  readonly whoami: () => Promise<{ readonly id: number; readonly login: string } | MailFailure>;
}

export type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

export interface Polling {
  /** How long to keep looking, and how often. */
  readonly withinMs: number;
  readonly everyMs: number;
  readonly sleep: (ms: number) => Promise<void>;
  readonly now: () => number;
}

export interface Outsiders {
  /** `url` is the `coworker-mailbox` Worker's, `address` the mailbox's own. */
  readonly mailboxPerson: (
    settings: { readonly url: string; readonly token: string; readonly address: string },
    fetch: Fetch,
    polling: Pick<Polling, "sleep" | "now">,
  ) => MailPerson;
  readonly githubPerson: (settings: { readonly token: string }, fetch: Fetch) => GitPerson;
  /**
   * Asks the app for a sign-in link (`ask`) and returns the link in the newest mail with `subject` that arrives in this
   * person's inbox after the ask, or `undefined` when none does in time.
   */
  readonly linkAfter: (person: MailPerson, subject: string, ask: () => Promise<Response>, polling: Polling) => Promise<string | undefined>;
  /** Calls `read` until it gives a value, or time is up (`undefined`). A read that throws is tried again. */
  readonly eventually: <T>(read: () => Promise<T | undefined>, polling: Polling) => Promise<T | undefined>;
}

export const isFailure = (value: unknown): value is MailFailure =>
  typeof value === "object" && value !== null && "_tag" in value && value._tag === "Failed";
