import type { Answer, Did } from "~/modules/api/types.ts";
import type { Ask } from "~/modules/asks/types.ts";
import type { AskAnswer, AskOp } from "~/modules/asking/types.ts";
import type { Role } from "~/modules/doings/types.ts";
import type { Heard } from "~/modules/following/types.ts";
import type { Decision, Item } from "~/modules/intake/types.ts";
import type { GitHubConnection, LostConnection } from "~/modules/github/types.ts";
import type { BillingView } from "~/modules/billing/types.ts";
import type { Clock, Ids } from "~/modules/clock/types.ts";
import type { ModelConnection } from "~/modules/models/types.ts";
import type { ManagerStores } from "~/modules/manager-store/types.ts";
import type { Template } from "~/modules/templates/types.ts";
import type { ManagerNode } from "~/modules/tree/types.ts";
import type { SecretInfo } from "~/modules/vault/types.ts";
import type { Region } from "~/modules/workspace/types.ts";

/*
 * The console's server side, for one request by one person in one workspace: every read of `api/types.ts`' map answered in
 * its view, and every change as a doing of the one registry (`POST /do`). It is given what it reads and changes, and
 * reaches for nothing: the Worker builds it, `http` calls it.
 */

export interface Member {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: Role;
}

/** One line of the audit log, as it is kept. */
export interface AuditRow {
  readonly id: string;
  readonly at: number;
  readonly by: string;
  readonly byId: string;
  readonly kind: "person" | "coworker" | "manager";
  readonly doing: string;
  readonly group: string;
  readonly says: string;
  readonly outcome: "done" | "refused" | "asked" | "failed";
  readonly why: string | null;
  readonly permission: "on" | "ask" | "off";
  readonly role: Role;
}

/** A manager of this workspace: its place in the tree, and where its own object is. */
export interface ManagerRow {
  readonly node: ManagerNode;
  readonly objectId: string;
  readonly region: Region;
  readonly by: string;
  readonly at: number;
  /** The places it hears (`acme/web`), read from its playbook when it was made. */
  readonly hears: readonly string[];
}

/** Something that came in, kept once, and what became of it. `decision`: null until it has been decided. */
export interface ItemRow {
  readonly item: Item;
  /** The managers that hear the place it came from. */
  readonly hears: readonly string[];
  readonly decision: Decision | null;
}

/** What the workspace's object keeps for the console. One call, one answer, named by `op`. */
export type StoreOp =
  | { readonly op: "claim"; readonly key: string; readonly doing: string; readonly at: number }
  | { readonly op: "settle"; readonly key: string; readonly did: Did }
  | { readonly op: "audit.add"; readonly row: Omit<AuditRow, "id"> }
  | {
      readonly op: "audit.list";
      readonly by: string | null;
      readonly outcome: string | null;
      readonly before: string | null;
      readonly limit: number;
    }
  | { readonly op: "setting.get"; readonly name: string }
  | { readonly op: "setting.set"; readonly name: string; readonly value: unknown }
  | { readonly op: "manager.add"; readonly row: ManagerRow }
  | { readonly op: "manager.list" }
  | { readonly op: "item.keep"; readonly item: Omit<Item, "id" | "trigger">; readonly trigger: string; readonly hears: readonly string[] }
  /** A delivery of GitHub was heard: what follows a conversation keeps its records, and what became true is made news. */
  | { readonly op: "github.hear"; readonly heard: Heard }
  | { readonly op: "ask.list" }
  | {
      readonly op: "item.list";
      readonly manager: string;
      readonly from: string | null;
      readonly before: string | null;
      readonly limit: number;
    }
  | MoreOp
  /** What people read and answer later (set-ups, asks, corrections): put by id, oldest first. */
  | { readonly op: "kept.put"; readonly kind: string; readonly id: string; readonly value: unknown }
  | { readonly op: "kept.list"; readonly kind: string }
  /** The co-worker's own conversations: messages as a model is sent them. */
  | { readonly op: "message.list"; readonly thread: string }
  | { readonly op: "message.add"; readonly thread: string; readonly message: unknown };

/** One thing said of a piece of work by a person: what it is, who did it, and when. */
export interface ActivityRow {
  readonly manager: string;
  readonly work: string;
  readonly who: string;
  readonly at: number;
  readonly text: string;
}

/** A chat of one person with the co-worker, and what it was started with. */
export interface ChatRow {
  readonly id: string;
  readonly by: string;
  readonly title: string;
  readonly at: number;
  readonly lines: readonly { readonly id: string; readonly by: string; readonly at: number; readonly text: string }[];
}

/** What else the workspace's object keeps for the console, beside `StoreOp`. */
export type MoreOp =
  /** A manager's row as it is now: its state, its reach, its version. */
  | { readonly op: "manager.set"; readonly row: ManagerRow }
  /** What was left because every manager that hears it was paused is decided again, as if it had just come in. */
  | { readonly op: "item.reopen"; readonly manager: string }
  | { readonly op: "activity.add"; readonly row: ActivityRow }
  | { readonly op: "activity.list"; readonly work: string }
  | { readonly op: "chat.add"; readonly chat: ChatRow }
  | { readonly op: "chat.list"; readonly by: string }
  /** These reads changed: every page that has a live socket open is told. */
  | { readonly op: "changed"; readonly reads: readonly string[] };

export type MoreAnswer =
  | { readonly op: "manager.set" | "item.reopen" | "activity.add" | "chat.add" | "changed" }
  | { readonly op: "activity.list"; readonly rows: readonly ActivityRow[] }
  | { readonly op: "chat.list"; readonly rows: readonly ChatRow[] };

export type StoreAnswer =
  | { readonly op: "claim"; readonly is: "yours" | "busy" | "done"; readonly did?: Did }
  | { readonly op: "settle" | "audit.add" | "setting.set" | "manager.add" }
  | { readonly op: "audit.list"; readonly lines: readonly AuditRow[]; readonly next: string | null }
  | { readonly op: "setting.get"; readonly value: unknown }
  | { readonly op: "manager.list"; readonly rows: readonly ManagerRow[] }
  | { readonly op: "item.keep"; readonly row: ItemRow; readonly isNew: boolean }
  | { readonly op: "github.hear" }
  | { readonly op: "ask.list"; readonly asks: readonly Ask[] }
  | { readonly op: "item.list"; readonly rows: readonly ItemRow[]; readonly next: string | null }
  | { readonly op: "kept.put" | "message.add" }
  | { readonly op: "kept.list"; readonly values: readonly unknown[] }
  | { readonly op: "message.list"; readonly messages: readonly unknown[] }
  | MoreAnswer;

/** The same, with each call named. */
export interface Store {
  readonly claim: (key: string, doing: string) => Promise<{ readonly is: "yours" | "busy" } | { readonly is: "done"; readonly did: Did }>;
  readonly settle: (key: string, did: Did) => Promise<void>;
  readonly audit: (row: Omit<AuditRow, "id">) => Promise<void>;
  readonly auditLines: (query: {
    readonly by: string | null;
    readonly outcome: string | null;
    readonly before: string | null;
    readonly limit: number;
  }) => Promise<{ readonly lines: readonly AuditRow[]; readonly next: string | null }>;
  readonly setting: (name: string) => Promise<unknown>;
  readonly set: (name: string, value: unknown) => Promise<void>;
  readonly managers: () => Promise<readonly ManagerRow[]>;
  readonly addManager: (row: ManagerRow) => Promise<void>;
  /** What waits for a person and is the workspace's own. */
  readonly asks: () => Promise<readonly Ask[]>;
  readonly items: (
    manager: string,
    query: { readonly from: string | null; readonly before: string | null; readonly limit: number },
  ) => Promise<{ readonly rows: readonly ItemRow[]; readonly next: string | null }>;
  /** A manager as it is now. */
  readonly setManager: (row: ManagerRow) => Promise<void>;
  /** What was left because its managers were paused is decided again. */
  readonly reopen: (manager: string) => Promise<void>;
  readonly note: (row: ActivityRow) => Promise<void>;
  readonly activity: (work: string) => Promise<readonly ActivityRow[]>;
  readonly addChat: (chat: ChatRow) => Promise<void>;
  readonly chats: (by: string) => Promise<readonly ChatRow[]>;
  /** Tells every open page that these reads changed. */
  readonly changed: (reads: readonly string[]) => Promise<void>;
  readonly keep: (kind: string, id: string, value: unknown) => Promise<void>;
  readonly kept: (kind: string) => Promise<readonly unknown[]>;
  readonly messages: (thread: string) => Promise<readonly unknown[]>;
  readonly addMessage: (thread: string, message: unknown) => Promise<void>;
}

/** What is outside the workspace's object that the console needs of it. */
export interface Outside {
  /** The connections to models, with their models and prices, and never a key. */
  readonly connections: () => Promise<readonly ModelConnection[]>;
  readonly secrets: () => Promise<readonly SecretInfo[]>;
  readonly github: () => Promise<GitHubConnection>;
  /** What the App was on when it was uninstalled, until it is installed again. */
  readonly lost: () => Promise<LostConnection | undefined>;
  readonly billing: () => Promise<BillingView | null>;
  /** Owners: the workspace's name changes in the directory, the object and the organization together. */
  readonly rename: (name: string) => Promise<{ readonly _tag: "Renamed" } | { readonly _tag: "Refused"; readonly why: string }>;
  /** Owners: a person's role, or their seat. What they lent ends with it. */
  readonly people: {
    readonly role: (person: string, role: Role) => Promise<{ readonly _tag: "Done" } | { readonly _tag: "Refused"; readonly why: string }>;
    readonly remove: (person: string) => Promise<{ readonly _tag: "Done" } | { readonly _tag: "Refused"; readonly why: string }>;
  };
  /** What is at a place, read only: its files by path (a folder is its names). Nothing is written. */
  readonly read: (
    place: string,
    path: string,
  ) => Promise<
    | { readonly _tag: "File"; readonly text: string }
    | { readonly _tag: "Folder"; readonly names: readonly string[] }
    | { readonly _tag: "Gone" }
  >;
  /** One call to a model, made for the workspace with its credential: the co-worker thinks with it. */
  readonly call: (path: string, body: string) => Promise<Response>;
}

export interface ConsoleDeps {
  readonly workspace: {
    readonly id: string;
    readonly name: string;
    readonly address: string;
    readonly region: Region;
    readonly since: number;
  };
  readonly who: Member;
  readonly people: readonly Member[];
  readonly store: Store;
  readonly outside: Outside;
  readonly asks: (op: AskOp) => Promise<AskAnswer>;
  readonly managers: ManagerStores;
  readonly ours: readonly Template[];
  readonly app: string | null;
  readonly mailbox: string;
  readonly clock: Clock;
  readonly ids: Ids;
}

/** The path after `/api/ws/<workspace>`, and what a request carries. */
export interface Call {
  readonly path: string;
  readonly query: URLSearchParams;
  readonly body?: unknown;
}

export interface Console {
  readonly read: (call: Call) => Promise<Answer<unknown>>;
  readonly write: (call: Call) => Promise<Answer<unknown>>;
}
