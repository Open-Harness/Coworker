import type { Mailer } from "~/modules/mail/types.ts";

/** The presets a member of a workspace starts from. Single actions are changed in the permissions catalogue. */
export type Preset = "owner" | "builder" | "member";

export interface OAuthClient {
  readonly clientId: string;
  readonly clientSecret: string;
}

export interface AuthSettings {
  /** Where the app is served, such as `https://app.co-worker.tech`. */
  readonly baseUrl: string;
  readonly secret: string;
  /** The address sign-in links and invites come from. */
  readonly sendFrom: string;
  readonly google?: OAuthClient | undefined;
  readonly github?: OAuthClient | undefined;
}

/** An account that was just made, as the sign-up hook reports it. */
export interface NewUser {
  readonly userId: string;
  readonly email: string;
  readonly emailVerified: boolean;
}

export interface AuthDependencies {
  /** The control-plane D1 database. */
  readonly database: D1Database;
  readonly mailer: Mailer;
  readonly settings: AuthSettings;
  /** Called once when an account is made, after it exists. It must not throw: a failure there never blocks sign-in. */
  readonly onSignUp?: (user: NewUser) => Promise<void>;
  /** Called after a person links an account, joins a workspace or leaves one. The same rule: it must not throw. */
  readonly onPersonChanged?: (change: PersonChange) => Promise<void>;
  readonly now: () => number;
}

export type PersonChange =
  | { readonly kind: "linked"; readonly userId: string }
  | { readonly kind: "joined" | "left"; readonly userId: string; readonly organizationId: string };

export interface SignedIn {
  readonly userId: string;
  readonly email: string;
  readonly name: string;
  readonly sessionId: string;
}

/** An account a person signs in with: `credential`-less, so `google`, `github` or `magic-link` (email). */
export interface LinkedAccount {
  readonly providerId: string;
  readonly accountId: string;
}

/** Besides the email link: the providers this deployment has clients for. */
export type SignInWay = "google" | "github";

/** An emailed invite, as whoever holds its link sees it before joining. */
export interface InviteView {
  readonly status: "open" | "used" | "expired" | "withdrawn";
  /** The only address that may accept it. */
  readonly email: string;
  readonly role: Preset;
  readonly workspaceId: string;
  readonly workspaceName: string;
  readonly address: string;
  /** The inviter's name, or their email while they have none. */
  readonly invitedBy: string;
}

export type AddMemberResult =
  | { readonly _tag: "Added" }
  | { readonly _tag: "AlreadyMember"; readonly role: Preset }
  | { readonly _tag: "Failed"; readonly message: string };

export type CreateOrganizationResult =
  | { readonly _tag: "Created"; readonly organizationId: string }
  | { readonly _tag: "SlugTaken" }
  | { readonly _tag: "Failed"; readonly message: string };

/**
 * Identity, sessions, organizations, members and invitations, on Better Auth. Organizations are workspaces; only the
 * workspaces module creates or deletes them, so a workspace never exists without its object.
 */
export interface Auth {
  /** Answers `/api/auth/*`, except creating and deleting organizations. */
  readonly handle: (request: Request) => Promise<Response>;
  readonly signedIn: (headers: Headers) => Promise<SignedIn | undefined>;
  readonly signInWays: readonly SignInWay[];
  /** An invite by the id its email carries, which nobody could guess. */
  readonly invitation: (id: string) => Promise<InviteView | undefined>;
  readonly accounts: (userId: string) => Promise<readonly LinkedAccount[]>;
  readonly createOrganization: (input: {
    readonly userId: string;
    readonly name: string;
    readonly slug: string;
  }) => Promise<CreateOrganizationResult>;
  /** Removes the organization with its members, invitations and teams. */
  readonly deleteOrganization: (organizationId: string) => Promise<void>;
  readonly role: (userId: string, organizationId: string) => Promise<Preset | undefined>;
  readonly organizationsOf: (userId: string) => Promise<readonly { readonly organizationId: string; readonly role: Preset }[]>;
  /** Joins a person to an organization with a preset, through Better Auth's own `addMember`. */
  readonly addMember: (input: {
    readonly userId: string;
    readonly organizationId: string;
    readonly role: Preset;
  }) => Promise<AddMemberResult>;
  /**
   * Remembers which email domains an organization approves, in the organization's own `metadata`, so a new account's
   * domain finds its workspaces without asking every object. A hint: the Workspace object stays the authority.
   */
  readonly setApprovedDomains: (organizationId: string, domains: readonly string[]) => Promise<void>;
  readonly organizationsApproving: (domain: string) => Promise<readonly string[]>;
  readonly isSlugTaken: (slug: string) => Promise<boolean>;
  /** Everyone with a seat in an organization. */
  readonly membersOf: (
    organizationId: string,
  ) => Promise<readonly { readonly userId: string; readonly email: string; readonly name: string; readonly role: Preset }[]>;
  /** Only the workspaces module renames: the name and slug are the workspace's name and address. */
  readonly renameOrganization: (organizationId: string, name: string, slug: string) => Promise<void>;
  /** Mails a link to `email` that proves it is this person's. */
  readonly sendEmailProof: (user: SignedIn, email: string) => Promise<void>;
  /** The address a link proves for the person signed in, or undefined when it is not good. */
  readonly emailProven: (user: SignedIn, token: string) => Promise<string | undefined>;
  /** A token GitHub's install page carries back, naming what it was opened for and by whom. It lasts an hour. */
  readonly gitHubState: (user: SignedIn, text: string) => Promise<string>;
  /** What the token was made for, or undefined when it is not good, or not this person's. */
  readonly gitHubStateOf: (user: SignedIn, token: string) => Promise<string | undefined>;
  /** A person's sign-in email and name, by account id. */
  readonly userOf: (userId: string) => Promise<{ readonly email: string; readonly name: string } | undefined>;
}
