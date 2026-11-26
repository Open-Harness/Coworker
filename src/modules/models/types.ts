import type { Clock, Ids } from "~/modules/clock/types.ts";
import type { Vault } from "~/modules/vault/types.ts";

/** A provider whose key a workspace brings. */
export type KeySource = "anthropic" | "openai" | "google" | "opencode";
/** Where a workspace's model access comes from. `endpoint` is any OpenAI-compatible server the workspace runs. */
export type ModelSource = KeySource | "endpoint" | "chatgpt";

/** The last test call, as the Keys screen shows it: "works, checked at …" or the provider's own error. */
export type Check =
  | { readonly _tag: "Works"; readonly checkedAt: number }
  | { readonly _tag: "Failed"; readonly checkedAt: number; readonly error: string };

/** A connection as anyone may see it. The key itself stays in the vault. */
export interface ModelConnection {
  readonly id: string;
  readonly source: ModelSource;
  readonly label: string;
  readonly baseUrl: string;
  readonly models: readonly string[];
  readonly check: Check;
  /** When the stored token expires, for sign-ins that have one. */
  readonly expiresAt?: number;
}

export type AddKey = { readonly source: KeySource; readonly key: string; readonly label?: string };
export type AddEndpoint = { readonly label: string; readonly baseUrl: string; readonly key?: string };

export type AddResult =
  | { readonly _tag: "Added"; readonly connection: ModelConnection }
  | { readonly _tag: "Invalid"; readonly reason: string };

export type Readiness =
  | { readonly _tag: "Ready"; readonly connection: ModelConnection }
  | { readonly _tag: "NoModel"; readonly reason: string };

/** The wire format a manager speaks for a connection: Anthropic's own, or OpenAI chat completions for everything else. */
export type ModelApi = "openai-completions" | "anthropic-messages";

/** A connection and one of its models, as a person or an agent chose them. */
export interface ModelPick {
  readonly connectionId: string;
  readonly model: string;
}

/**
 * Which connection answers a manager, and in which format to ask it. No key, no provider address. `model` is set when
 * a choice was honoured; `notice` says so, in words, when a chosen connection could not be used and another answered.
 */
export type ModelRoute =
  | {
      readonly _tag: "Route";
      readonly connectionId: string;
      readonly label: string;
      readonly source: ModelSource;
      readonly api: ModelApi;
      readonly model?: string;
      readonly notice?: string;
    }
  | { readonly _tag: "NoModel"; readonly reason: string };

/**
 * A model call as a manager makes it: the request path under the connection (`/<id>/v1/chat/completions` or
 * `/<id>/v1/messages`), its JSON body and a few plain headers. The workspace adds the credential and chooses the model.
 */
export interface ModelCall {
  readonly path: string;
  readonly body: string;
  readonly headers: Readonly<Record<string, string>>;
}

export interface ModelsDependencies {
  /** The Workspace object's own storage. */
  readonly sql: SqlStorage;
  readonly vault: Vault;
  /** Reaches the providers. The fast tier answers with `testing.ts`. */
  readonly fetch: typeof fetch;
  readonly clock: Clock;
  readonly ids: Ids;
  /** The workspace's default model, read when a route is made. Absent: none is set. */
  readonly defaultPick?: () => ModelPick | undefined;
}

/**
 * A workspace's model access: provider keys, its own endpoints and ChatGPT sign-in. Adding one runs a test call and
 * keeps the result, so the Keys screen and a manager about to start both know whether it works.
 */
export interface Models {
  readonly addKey: (input: AddKey) => Promise<AddResult>;
  readonly addEndpoint: (input: AddEndpoint) => Promise<AddResult>;
  /** Runs the test call again and keeps the new result. */
  readonly recheck: (id: string) => Promise<ModelConnection | undefined>;
  /** Replaces a key, or edits an endpoint's name and address, then tests it again. `undefined`: no such connection. */
  readonly change: (
    id: string,
    edit: { readonly label?: string; readonly baseUrl?: string; readonly key?: string },
  ) => Promise<AddResult | undefined>;
  readonly list: () => readonly ModelConnection[];
  readonly remove: (id: string) => boolean;
  /** The ChatGPT address to open. The person pastes back where the browser ends up. */
  readonly startChatGpt: () => Promise<string>;
  readonly finishChatGpt: (redirectUrl: string) => Promise<AddResult>;
  /** Refreshes sign-ins about to expire. Returns when the next one falls due, for the object's alarm. */
  readonly refreshDue: () => Promise<number | undefined>;
  readonly nextRefresh: () => number | undefined;
  /** Whether a manager may start, and if not, what to tell the person. */
  readonly readiness: () => Readiness;
  /**
   * Which connection a manager's model calls go to now. In order: the `wanted` choice (an agent's or a manager's), the
   * workspace's default model, the first connection that works. A choice whose connection stopped working is skipped, and
   * the route's `notice` says which and what answered instead.
   */
  readonly route: (wanted?: ModelPick) => ModelRoute;
  /**
   * Makes a manager's model call with the connection's credential, which is read from the vault and held only while
   * the response streams. The response carries the provider's answer and nothing of the credential. Never throws.
   */
  readonly forward: (call: ModelCall) => Promise<Response>;
}
