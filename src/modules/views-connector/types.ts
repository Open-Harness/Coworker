/*
 * What a connector's own view is given: what the co-worker sees there, as that system shows it. No tool calls and no
 * reasoning in any of them. The stream of a conversation is the same shape in all.
 */

/** One thing in a stream, oldest first. */
export type Entry = { readonly id: string; readonly at: number } & (
  | {
      readonly is: "in";
      readonly by: string;
      readonly address: string;
      readonly text: string;
      readonly files: readonly { readonly name: string; readonly link: string }[];
    }
  /** Ours. `by`: who wrote it as the co-worker, a manager or a person. */
  | { readonly is: "out"; readonly by: string; readonly person: boolean; readonly text: string; readonly sent: boolean }
  | { readonly is: "draft"; readonly by: string; readonly text: string; readonly ask: string }
  /** "Became ACME-412", "Handed to Coding", "Ama Mensah took over", "You told Support: …" */
  | { readonly is: "note"; readonly text: string; readonly link: string | null }
  /** What a CRM recorded: the line it shows, and the mail or the note behind it. `dir`: into the CRM, or out of it. */
  | {
      readonly is: "change";
      readonly dir: "in" | "out";
      readonly by: string;
      readonly text: string;
      readonly became: string | null;
      readonly mail: { readonly subject: string; readonly body: string } | null;
      readonly note: string | null;
    }
  /** A review on a pull request: what it said overall, and the comments on lines (ids in `RepoItemView.comments`). */
  | {
      readonly is: "review";
      readonly by: string;
      readonly verdict: "approved" | "asked for changes" | "commented";
      readonly text: string;
      readonly comments: readonly string[];
    }
);

export interface Conversation {
  readonly id: string;
  readonly with: string;
  readonly address: string;
  readonly subject: string;
  readonly preview: string;
  readonly at: number;
  readonly unread: number;
  readonly waits: "us" | "person" | "them" | "done";
  readonly tags: readonly string[];
  readonly work: string | null;
  /** The title of that piece of work. */
  readonly workTitle: string | null;
  /** Who wrote the last line: them, us, or us and it is not sent yet. */
  readonly lastIs: "them" | "ours" | "unsent";
  readonly thread: string | null;
  /** Who has it: the manager, or a person until they hand it back. */
  readonly has: "manager" | { readonly person: string };
  /** A group chat: how many people are in it. */
  readonly group: number | null;
  /** The address is not saved as a contact. */
  readonly saved: boolean;
  /** They asked us to stop: nothing more is sent. */
  readonly stopped: boolean;
}

export interface MailView {
  readonly mailbox: string;
  readonly conversations: readonly Conversation[];
}
export interface ConversationView {
  readonly conversation: Conversation;
  readonly stream: readonly Entry[];
}
export interface ChatsOnPhoneView {
  readonly number: string;
  readonly works: boolean;
  readonly since: number;
  readonly conversations: readonly Conversation[];
}
/** A thread that a thread started, to any depth. `link`: where it opens, when it has a page. */
export interface Fork {
  readonly name: string;
  readonly link: string | null;
  readonly forks: readonly Fork[];
}
export interface SlackThread {
  readonly id: string;
  readonly name: string;
  readonly state: "working" | "answered" | "asks";
  /** The people it waits for, when it asks who decides. */
  readonly waits: readonly string[];
  readonly work: string | null;
  readonly forks: readonly Fork[];
}
export interface SlackView {
  readonly team: string;
  readonly channels: readonly {
    readonly id: string;
    readonly kind: "channel" | "direct";
    readonly name: string;
    readonly topic: string;
    readonly unread: number;
    readonly threads: readonly SlackThread[];
  }[];
  readonly open: {
    readonly id: string;
    /** `thread`: the id of the thread forked from this message. */
    readonly stream: readonly (Entry & { readonly thread: string | null })[];
    /** The one open beside the stream first. */
    readonly thread: string | null;
    readonly threads: readonly (SlackThread & {
      /** The message it was forked from, and when. */
      readonly root: string;
      readonly at: number;
      /** The thread page of the work, where "how it got here" opens. */
      readonly how: string | null;
      readonly replies: readonly Entry[];
    })[];
  };
}

export interface Deal {
  readonly id: string;
  readonly name: string;
  readonly company: string;
  readonly stage: string;
  readonly amount: number;
  readonly owner: string;
  readonly work: string | null;
  readonly waits: boolean;
  /** When the deal should be decided by. */
  readonly closes: number | null;
  readonly seats: number;
  readonly perSeat: number;
  /** Once, at the start. */
  readonly setup: number;
  /** The last change: who, when, and what it was. */
  readonly changed: { readonly by: string; readonly at: number; readonly says: string };
}
export interface DealsView {
  readonly stages: readonly { readonly id: string; readonly name: string }[];
  readonly deals: readonly Deal[];
  /** Deals in the CRM. `deals` are the ones that changed most recently. */
  readonly total: number;
  /** What Sales has open, its good calls this week against the aim, and what waits for a person. */
  readonly sales: {
    readonly open: number;
    readonly calls: { readonly done: number; readonly of: number };
    readonly waitsForPerson: number;
  };
}
export interface DealView {
  readonly deal: Deal;
  readonly company: { readonly site: string; readonly size: string; readonly city: string };
  /** Where the lead came from. */
  readonly source: string;
  /** What Sales may do in this CRM. */
  readonly may: readonly { readonly does: string; readonly is: "on" | "ask" | "off" }[];
  readonly people: readonly { readonly name: string; readonly role: string; readonly address: string }[];
  readonly notes: readonly { readonly by: string; readonly at: number; readonly text: string }[];
  readonly stream: readonly Entry[];
  readonly pending: string | null;
}

export interface RepoItem {
  readonly number: number;
  readonly is: "issue" | "pull request";
  readonly title: string;
  readonly state: "open" | "merged" | "closed";
  readonly labels: readonly string[];
  readonly by: string;
  readonly at: number;
  readonly waits: "us" | "person" | "checks" | "reporter" | "done";
  readonly says: string;
  readonly work: string | null;
  /** A pull request that closes this issue: the issue's number. */
  readonly closes: number | null;
  /** The pull request that fixes this issue. */
  readonly fixedBy: number | null;
  /** A pull request into another pull request. */
  readonly into: number | null;
  readonly opened: number;
  readonly checks: "passed" | "failed" | "running" | null;
  readonly openComments: number;
}
export interface RepoView {
  readonly repo: string;
  readonly items: readonly RepoItem[];
}
export interface RepoItemView {
  readonly item: RepoItem;
  readonly thread: string | null;
  readonly body: string;
  readonly stream: readonly Entry[];
  readonly comments: readonly {
    readonly id: string;
    readonly path: string;
    readonly line: number;
    readonly hunk: string;
    readonly done: boolean;
    readonly stream: readonly Entry[];
  }[];
  readonly checks: readonly {
    readonly name: string;
    readonly is: "passed" | "failed" | "running";
    readonly says: string;
    readonly took: number;
    readonly link: string;
  }[];
  readonly files: readonly { readonly path: string; readonly added: number; readonly gone: number; readonly patch: string }[];
}
