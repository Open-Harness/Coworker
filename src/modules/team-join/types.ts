import type { ReactNode } from "react";
import type { Loaded } from "~/modules/team-core/types.ts";

/*
 * How a person gets in: signing in, and joining a workspace by an emailed invite or an invite link. Pages here work
 * for someone who is not signed in yet.
 */

/** Who is signed in at this browser. */
export interface Who {
  readonly name: string;
  readonly email: string;
}

/** Besides the email link. */
export type Way = "google" | "github";

export type Role = "owner" | "builder" | "member";

/** An emailed invite, as its link shows it. */
export interface Invite {
  readonly status: "open" | "used" | "expired" | "withdrawn";
  readonly email: string;
  readonly role: Role;
  readonly workspaceId: string;
  readonly workspaceName: string;
  readonly address: string;
  readonly invitedBy: string;
}

export interface JoinApi {
  readonly who: () => Promise<Loaded<Who | null>>;
  readonly ways: () => Promise<Loaded<readonly Way[]>>;
  /** Emails a sign-in link that comes back to `returnTo`. */
  readonly sendLink: (email: string, returnTo: string) => Promise<Loaded<true>>;
  /** Gives the provider's own page to go to. */
  readonly signInWith: (way: Way, returnTo: string) => Promise<Loaded<string>>;
  /** The same, to add a provider to the account signed in now. */
  readonly linkAccount: (way: Way, returnTo: string) => Promise<Loaded<string>>;
  readonly signOut: () => Promise<Loaded<true>>;
  readonly invite: (id: string) => Promise<Loaded<Invite>>;
  /** Gives the workspace joined. */
  readonly acceptInvite: (id: string) => Promise<Loaded<string>>;
  readonly joinByLink: (workspaceId: string, secret: string) => Promise<Loaded<string>>;
  readonly isMember: (workspaceId: string) => Promise<Loaded<boolean>>;
  /** Asks the Owners of the workspace at an address. */
  readonly askToJoin: (address: string) => Promise<Loaded<"asked" | "waiting" | "member">>;
  /** Mails a link that proves another address is this person's. */
  readonly addEmail: (email: string) => Promise<Loaded<true>>;
  /** Gives the address the link proved. */
  readonly proveEmail: (token: string) => Promise<Loaded<string>>;
}

export interface SessionProps {
  readonly api: JoinApi;
  /** Pages that greet someone who is not signed in themselves. Everything else shows the sign-in page. */
  readonly isOpen: boolean;
  readonly children: ReactNode;
}

export interface SignInPageProps {
  readonly title: string;
  readonly description: string;
  /** The only address that will do, such as the one an invite went to. */
  readonly email?: string | undefined;
}

export interface InvitePageProps {
  readonly inviteId: string;
}

export interface LinkPageProps {
  readonly workspaceId: string;
  readonly secret: string;
}

export interface EmailProofPageProps {
  readonly token: string;
}

export interface AccountsPageProps {
  readonly workspaceId: string;
}
