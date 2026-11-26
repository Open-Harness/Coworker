import type { Clock, Ids } from "~/modules/clock/types.ts";
import type { AddServer, Added, McpServer } from "~/modules/mcp/types.ts";

/*
 * The MCP servers a workspace added: an address and a sign-in, and the tools each says it has. A tool is called by the name a model
 * sees (`mcp_<server>_<tool>`). The secret is in the vault and is used for one call: it is never in an answer. Nothing comes in through a server.
 */

export type McpCall =
  /** `by`: who added it. */
  | { readonly is: "add"; readonly server: AddServer; readonly by: string }
  | { readonly is: "list" }
  | { readonly is: "call"; readonly name: string; readonly args: unknown };

/** A tool as a model is offered it. */
export interface McpTool {
  readonly name: string;
  readonly server: string;
  readonly says: string;
  /** The server's own words for what it takes, as JSON Schema. */
  readonly input: Readonly<Record<string, unknown>>;
}

export type McpAnswer =
  | { readonly is: "added"; readonly added: Added }
  | { readonly is: "listed"; readonly held: readonly Held[]; readonly tools: readonly McpTool[] }
  | { readonly is: "called"; readonly says: string; readonly ok: boolean }
  /** It could not be done, and why in words: no such tool, or the server did not answer. */
  | { readonly is: "failed"; readonly why: string };

/** A server as kept: what a page shows, and what each tool takes. */
export interface Held {
  readonly server: McpServer;
  readonly by: string;
  readonly added: number;
  readonly inputs: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
}

export interface McpStore {
  readonly all: () => readonly Held[];
  readonly put: (held: Held) => void;
}

export interface McpDeps {
  readonly store: McpStore;
  /** Reaches the network as the workspace does. */
  readonly fetch: typeof fetch;
  /** The vault: a secret is put once, and used for one call. `undefined`: there is none by that name. */
  readonly secrets: {
    readonly put: (name: string, value: string) => Promise<void>;
    readonly use: <T>(name: string, run: (secret: string) => Promise<T>) => Promise<T | undefined>;
  };
  readonly clock: Clock;
  readonly ids: Ids;
}

export interface Servers {
  readonly handle: (call: McpCall) => Promise<McpAnswer>;
}
