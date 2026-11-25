import type { ToolRegistration } from "@earendil-works/pi-durable";

export interface WebDependencies {
  readonly fetch: (input: string, init?: RequestInit) => Promise<Response>;
}

/** Why a URL may not be fetched. */
export type Refusal = { readonly ok: false; readonly reason: string };
export type CheckedUrl = { readonly ok: true; readonly url: URL } | Refusal;

/** Builds the `web_fetch` tool. It reads public web pages only; see README for what "public" means here. */
export type CreateWebFetchTool = (dependencies: WebDependencies) => ToolRegistration;
