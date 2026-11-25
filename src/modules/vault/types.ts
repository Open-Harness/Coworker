import type { Clock } from "~/modules/clock/types.ts";

/** The key that wraps every workspace's data key. Kept in Secrets Store; never stored next to what it wraps. */
export interface MasterKey {
  readonly id: string;
  readonly wrap: (dataKey: Uint8Array<ArrayBuffer>) => Promise<Uint8Array<ArrayBuffer>>;
  /** `undefined` when this key did not wrap it. */
  readonly unwrap: (wrapped: Uint8Array<ArrayBuffer>) => Promise<Uint8Array<ArrayBuffer> | undefined>;
}

/** The current master key, and the ones it replaced, kept only until every data key is rewrapped. */
export interface MasterKeys {
  readonly current: MasterKey;
  readonly retired: readonly MasterKey[];
}

export interface SecretInfo {
  readonly name: string;
  readonly updatedAt: number;
}

/** What the vault tells the workspace's audit log. Never a value. */
export interface VaultAuditLine {
  readonly action: "put" | "use" | "remove";
  readonly name: string;
  readonly at: number;
}

export type UseResult<T> =
  | { readonly _tag: "Used"; readonly value: T }
  | { readonly _tag: "NoSuchSecret"; readonly name: string }
  | { readonly _tag: "Undecryptable"; readonly name: string };

export type RewrapResult =
  | { readonly _tag: "Rewrapped"; readonly to: string }
  | { readonly _tag: "AlreadyCurrent" }
  | { readonly _tag: "NoDataKey" }
  | { readonly _tag: "NoMasterKeyFits"; readonly wrappedBy: string };

export interface VaultDependencies {
  /** The Workspace object's own storage. */
  readonly sql: SqlStorage;
  readonly masterKeys: MasterKeys;
  readonly clock: Clock;
  readonly audit: (line: VaultAuditLine) => void;
}

/**
 * One workspace's secrets, encrypted with AES-GCM under the workspace's own data key, which is stored wrapped by the
 * master key. A value is decrypted only inside `use`, for the length of one call, and is never returned otherwise.
 */
export interface Vault {
  readonly put: (name: string, plaintext: string) => Promise<void>;
  readonly use: <T>(name: string, fn: (plaintext: string) => Promise<T> | T) => Promise<UseResult<T>>;
  readonly list: () => readonly SecretInfo[];
  readonly remove: (name: string) => boolean;
  /** Wraps the data key under the current master key. The secrets themselves are not touched. */
  readonly rewrap: () => Promise<RewrapResult>;
}
