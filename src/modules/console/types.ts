import type { Answer, Did } from "~/modules/api/types.ts";
import type { AskAnswer, AskOp } from "~/modules/asking/types.ts";
import type { Role } from "~/modules/doings/types.ts";
import type { Decision, Item } from "~/modules/intake/types.ts";
import type { GitHubConnection } from "~/modules/github/types.ts";
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
  | {
      readonly op: "item.list";
      readonly manager: string;
      readonly from: string | null;
      readonly before: string | null;
      readonly limit: number;
    };

export type StoreAnswer =
  | { readonly op: "claim"; readonly is: "yours" | "busy" | "done"; readonly did?: Did }
  | { readonly op: "settle" | "audit.add" | "setting.set" | "manager.add" }
  | { readonly op: "audit.list"; readonly lines: readonly AuditRow[]; readonly next: string | null }
  | { readonly op: "setting.get"; readonly value: unknown }
  | { readonly op: "manager.list"; readonly rows: readonly ManagerRow[] }
  | { readonly op: "item.keep"; readonly row: ItemRow; readonly isNew: boolean }
  | { readonly op: "item.list"; readonly rows: readonly ItemRow[]; readonly next: string | null };

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
  readonly items: (
    manager: string,
    query: { readonly from: string | null; readonly before: string | null; readonly limit: number },
  ) => Promise<{ readonly rows: readonly ItemRow[]; readonly next: string | null }>;
}

/** What is outside the workspace's object that the console needs of it. */
export interface Outside {
  /** The connections to models, with their models and prices, and never a key. */
  readonly connections: () => Promise<readonly ModelConnection[]>;
  readonly secrets: () => Promise<readonly SecretInfo[]>;
  readonly github: () => Promise<GitHubConnection>;
  readonly billing: () => Promise<BillingView | null>;
  /** Owners: the workspace's name changes in the directory, the object and the organization together. */
  readonly rename: (name: string) => Promise<{ readonly _tag: "Renamed" } | { readonly _tag: "Refused"; readonly why: string }>;
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
  /** What waits for a person: the workspace keeps it. See `asking`. */
  readonly asks: (op: AskOp) => Promise<AskAnswer>;
  readonly managers: ManagerStores;
  /** Ours: the templates the product comes with, read from `docs/templates`. */
  readonly ours: readonly Template[];
  /** The name of the GitHub App's bot (`juno-test`): the co-worker's address there. */
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
