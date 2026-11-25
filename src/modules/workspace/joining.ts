import type { NotProvisioned } from "./types.ts";

/** How people may join a workspace, and what is asked of them. */

/** How people may join without an emailed invite. Owners change it in Settings. */
export interface JoinSettings {
  readonly linksOn: boolean;
  /** The secret in the invite link while links are on. */
  readonly linkSecret?: string;
  /** Email domains whose new accounts join straight away, lowercase. */
  readonly domains: readonly string[];
}

export type JoinSettingsResult = { readonly _tag: "Settings"; readonly settings: JoinSettings } | NotProvisioned;

export type SetDomainsResult =
  | { readonly _tag: "Saved"; readonly settings: JoinSettings }
  | { readonly _tag: "InvalidDomain"; readonly domain: string }
  | NotProvisioned;

/** What a person offers to join: the link's secret, or the domain of their verified email. */
export type JoinProof = { readonly kind: "link"; readonly secret: string } | { readonly kind: "domain"; readonly domain: string };

/** Someone signed in who asks to join. */
export interface JoinRequester {
  readonly userId: string;
  readonly email: string;
  readonly name: string;
}

export type RequestJoinResult = { readonly _tag: "Requested" } | { readonly _tag: "AlreadyRequested" } | NotProvisioned;
