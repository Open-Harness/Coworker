import type { Clock } from "~/modules/clock/types.ts";

/** On: it runs. Off: it is refused (and a manager is not offered it). Ask: it waits for a person's answer. */
export type Permission = "on" | "off" | "ask";

export type Category =
  | "read"
  | "board"
  | "tasks"
  | "triage"
  | "runs"
  | "mission"
  | "outside"
  | "who-may-ask"
  | "sources"
  | "itself"
  | "workspace";

/** One action in actions.md: one id for the button and the manager's tool. */
export interface ActionSpec {
  readonly id: string;
  readonly category: Category;
  /** What it does, as actions.md says it. */
  readonly label: string;
  /** Where its button is. */
  readonly screen: string;
  /** The catalogue's default when the action overrides its category. */
  readonly permission?: Permission;
  /** The sentence for the audit log, the ask prompt and the task history, with `{by}` and `{input key}` slots. */
  readonly sentence: string;
}

export type By =
  | { readonly kind: "person"; readonly id: string; readonly name: string }
  | { readonly kind: "manager"; readonly id: string; readonly name: string };

/** Settings over the catalogue: a category's default, then single actions. */
export interface PermissionSet {
  readonly categories: Partial<Record<Category, Permission>>;
  readonly actions: Readonly<Record<string, Permission>>;
}

export type PersonPreset = "owner" | "builder" | "member";

/** Where permissions come from: a manager's own settings, or a person's preset and their own changes. */
export interface PermissionSources {
  readonly manager: (managerId: string) => PermissionSet;
  readonly person: (personId: string) => { readonly preset: PersonPreset; readonly own: PermissionSet } | undefined;
}

/** One line in the workspace's audit log. The sentence is `describe()` at the time of the call. */
export interface ActionRecord {
  readonly action: string;
  readonly input: unknown;
  readonly by: By;
  readonly at: number;
  readonly permission: Permission;
  readonly approvedBy?: string;
  readonly sentence: string;
  readonly outcome: "done" | "refused" | "asked" | "failed";
}

export type CallResult =
  | { readonly _tag: "Done"; readonly value: unknown }
  | { readonly _tag: "Refused"; readonly reason: string }
  | { readonly _tag: "Ask"; readonly sentence: string }
  | { readonly _tag: "Failed"; readonly message: string }
  | { readonly _tag: "Unknown"; readonly action: string };

export type Handler = (input: Readonly<Record<string, unknown>>, by: By) => Promise<unknown>;

export interface ActionsDependencies {
  readonly sources: PermissionSources;
  readonly handlers: Readonly<Record<string, Handler>>;
  readonly audit: (record: ActionRecord) => void;
  readonly clock: Clock;
}

/**
 * The action catalogue and its one door. Every call, by a button or by the manager, checks its permission, runs, and
 * writes one audit line saying who did it, under which permission, in a plain sentence.
 */
export interface Actions {
  readonly catalogue: readonly ActionSpec[];
  readonly check: (by: By, actionId: string) => Permission;
  readonly describe: (actionId: string, input: Readonly<Record<string, unknown>>, by: By) => string;
  /** `approvedBy` is the person who answered "allow" to an ask. */
  readonly call: (actionId: string, input: Readonly<Record<string, unknown>>, by: By, approvedBy?: string) => Promise<CallResult>;
}

/** A button a person pressed whose own setting is ask: what it was, for the Owners to allow or deny. */
export interface ApprovalRequest {
  /** The press's own request id: asking again with it asks once. */
  readonly requestId: string;
  readonly managerId: string;
  readonly actionId: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly by: { readonly id: string; readonly name: string };
  readonly preset: "owner" | "builder" | "member";
  /** The action's own sentence: the ask, the audit line and the history say the same words. */
  readonly sentence: string;
}

/** Which lines of the audit log to read. Every field narrows; `before` continues from a page's `next`. */
export interface AuditQuery {
  /** A person id or a manager id. */
  readonly by?: string;
  readonly kind?: "person" | "manager";
  /** A manager's id; empty for what happened to the workspace itself. */
  readonly manager?: string;
  /** A category of the catalogue, or `settings`. */
  readonly category?: string;
  readonly permission?: "on" | "ask" | "off";
  readonly outcome?: ActionRecord["outcome"];
  readonly since?: number;
  readonly until?: number;
  readonly before?: string;
  readonly limit?: number;
}
