import type { Permission } from "~/modules/reach/types.ts";

/* Tools added without code: an address and a sign-in. Nothing comes in through one. Not a connector. */

export interface McpServer {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly signIn: { readonly secret: string } | { readonly oauth: string } | null;
  readonly tools: readonly { readonly name: string; readonly says: string; readonly readOnly: boolean; readonly is: Permission }[];
  readonly state: { readonly _tag: "Works"; readonly at: number } | { readonly _tag: "Failed"; readonly why: string; readonly at: number };
  readonly usedBy: readonly string[];
}

export type AddServer = { readonly name: string; readonly url: string; readonly secret?: string };
export type Added = { readonly _tag: "Added"; readonly server: McpServer } | { readonly _tag: "Refused"; readonly why: string };

export interface Mcp {
  /** Read-only tools start on, the others at ask. */
  readonly starts: (tool: { readonly readOnly: boolean }) => Permission;
  /** Https, not a private address, not one of ours. */
  readonly mayBe: (url: string) => string | null;
  /** A tool that is gone, new, or changed what it says since a person set it goes back to ask. */
  readonly again: (
    known: McpServer["tools"],
    now: readonly { readonly name: string; readonly says: string; readonly readOnly: boolean }[],
  ) => McpServer["tools"];
  /** The name a model sees: `mcp_<server>_<tool>`. Never one of ours. */
  readonly toolName: (server: string, tool: string) => string;
}
