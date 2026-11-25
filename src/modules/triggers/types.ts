/*
 * Where work comes from (model.md "The flow" and "Who may start work: the Gate"). A Source turns what it hears into
 * a Trigger; the Workspace object stores it once, follows it to a Task or runs the Gate; the manager triages the
 * candidate. Everything here is plain data, safe to store as JSON.
 */

/** One conversation on a platform: an email thread, a GitHub issue. `key` is unique within `kind`. */
export interface ThreadRef {
  readonly kind: string;
  readonly key: string;
}

/** Who sent it, in the platform's own identity, never mapped by display name. */
export interface Actor {
  readonly kind: string;
  /** Where `id` is unique: a Slack team. None for email or GitHub. */
  readonly space?: string;
  /** The platform's stable id: a lowercased address, a GitHub user id. */
  readonly id: string;
  readonly human: boolean;
  readonly display?: string;
  /** The platform vouches for `id`: DKIM passed, the webhook was signed. A false one is an unknown sender. */
  readonly verified: boolean;
}

/** Where an answer goes. */
export type ReplyAddress =
  | {
      readonly kind: "email";
      readonly to: string;
      readonly subject: string;
      /** The message being answered, and the thread before it, for `In-Reply-To` and `References`. */
      readonly messageId: string;
      readonly references: readonly string[];
    }
  | {
      readonly kind: "github";
      readonly installation: number;
      readonly repo: string;
      readonly number: number;
      /** A pull request from a fork: nothing made for it may write to the base repo. */
      readonly fork: boolean;
    };

/** A file kept in R2. */
export interface FileRef {
  readonly key: string;
  readonly name: string;
  readonly type: string;
  readonly size: number;
}

/** One immutable event. Its id comes from the platform's own id, so the same event twice is one Trigger. */
export interface Trigger {
  readonly id: string;
  /** The Source kind: "email", "github". */
  readonly source: string;
  readonly managerId: string;
  /** The receiving scope the admission table is keyed by: "mailbox", "repo:acme/api:issues". */
  readonly scope: string;
  /** The first is primary; the rest only add context. */
  readonly threads: readonly ThreadRef[];
  readonly actor: Actor;
  /** Did it speak to the manager? */
  readonly addressed?: "mention" | "direct";
  readonly at: number;
  readonly title: string;
  readonly text: string;
  readonly attachments: readonly FileRef[];
  readonly replyTo: ReplyAddress;
  /** A task the address itself names, as `launch+dt-14@…` does: a follow-up with no Gate. */
  readonly task?: string;
}

export interface HandleRef {
  readonly kind: string;
  readonly space?: string;
  readonly id: string;
}

/** How a Handle got there (model.md "People and handles"). Each counts as explicit. */
export type Proof = "signed_in" | "verified" | "added";

/** How one Person appears on one platform. Matched on `(kind, space, id)`, never on `display`. */
export interface Handle extends HandleRef {
  readonly display?: string;
  readonly proof: Proof;
}

/** An entry in a manager's allowed list. A Person counts with every Handle they have, now and later. */
export type Allow =
  | { readonly kind: "person"; readonly person: string }
  | { readonly kind: "domain"; readonly domain: string }
  | { readonly kind: "handle"; readonly handle: HandleRef };

export type Admission = "ignore" | "inferred" | "explicit";
export type AcceptMode = "off" | "observe" | "auto";
export type Strength = "explicit" | "inferred";

/** A manager's rules for accepting work. */
export interface Policy {
  readonly acceptMode: AcceptMode;
  readonly allowed: readonly Allow[];
  /** Per receiving scope, what happens to someone not on the list. Unlisted scopes ignore them. */
  readonly admission: Readonly<Record<string, Admission>>;
  /** Bots whose messages may become inferred candidates. */
  readonly bots: readonly HandleRef[];
}

export type Gated = { readonly _tag: "Candidate"; readonly strength: Strength } | { readonly _tag: "Ignored"; readonly reason: string };

/** What the Workspace did with a Trigger. */
export type Routed =
  | Gated
  | { readonly _tag: "FollowUp"; readonly task: string }
  | { readonly _tag: "Duplicate" }
  | { readonly _tag: "Dropped"; readonly reason: string }
  /** The manager could not be reached; nothing was kept, so the platform's retry is safe. */
  | { readonly _tag: "Failed"; readonly reason: string };

/** The Gate: plain code, no model. */
export interface Triggers {
  /** `person` is who the Trigger's actor resolved to through its Handle, if anyone. */
  readonly gate: (trigger: Trigger, policy: Policy, person?: string) => Gated;
  readonly isAllowed: (actor: Actor, policy: Policy, person?: string) => boolean;
  readonly defaultPolicy: Policy;
  /** Narrows a stored or sent policy; anything malformed is left out. */
  readonly policyOf: (value: unknown) => Policy;
  /** One Channel over one per Source kind; a kind with none is `Gone`. */
  readonly channels: (byKind: Readonly<Record<string, Channel>>) => Channel;
}

/** A reply going back out on the Thread a Task came from. */
export interface Outbound {
  /** One per message: a resend with the same key sends nothing twice. */
  readonly key: string;
  /** The manager's own address and name: `launch.acme@co-worker.tech`, "Launch". */
  readonly from: { readonly address: string; readonly name: string };
  readonly to: ReplyAddress;
  readonly task: string;
  readonly text: string;
}

export type SendOutcome =
  | { readonly _tag: "Sent" }
  | { readonly _tag: "Gone"; readonly reason: string }
  | { readonly _tag: "Failed"; readonly reason: string };

/** Writes to the outside, per Source kind. `Failed` is retried; `Gone` never will work. */
export interface Channel {
  readonly send: (outbound: Outbound) => Promise<SendOutcome>;
}

/** Where large files live (R2). Keys are made by the caller and never shown to a sender. */
export interface FileStore {
  readonly put: (key: string, body: Uint8Array, type: string) => Promise<void>;
  readonly get: (key: string) => Promise<Uint8Array | undefined>;
}
