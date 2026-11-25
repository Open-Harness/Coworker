/*
 * The live tier's credentials: which ones there are, who supplies each, and where they are kept. They are kept in one
 * Bitwarden item and nowhere else on this computer. Every outside thing is injected, and no function here returns a value
 * to a screen: what is printed is the list (`list`), which says only whether each one is there.
 */

export type Values = Readonly<Record<string, string>>;

/** Who a credential comes from. `you` is asked for; the rest are never typed. */
export type Source =
  | { readonly _tag: "You"; readonly page?: string; readonly how: string; readonly hidden: boolean }
  | { readonly _tag: "MadeHere" }
  | { readonly _tag: "GithubApp" }
  | { readonly _tag: "WorkedOut" };

export interface Credential {
  readonly name: string;
  readonly about: string;
  readonly source: Source;
}

/** A row of the list. Never a value. */
export interface Row {
  readonly name: string;
  readonly about: string;
  readonly source: Source["_tag"];
  readonly there: boolean;
}

export type Problem = { readonly _tag: "Problem"; readonly reason: string };
export type Accepted = { readonly _tag: "Accepted"; readonly value: string } | Problem;
export type Written = { readonly _tag: "Written"; readonly names: readonly string[] } | Problem;

/** The one place values are kept. `read` is empty when the item does not exist yet; `write` makes it. */
export interface Store {
  readonly read: () => Promise<Values | Problem>;
  readonly write: (values: Values) => Promise<Written>;
}

/** Runs a program, with text on its standard input: a secret is never an argument, which other programs can see. */
export type Run = (
  argv: readonly string[],
  stdin?: string,
) => Promise<{ readonly code: number; readonly stdout: string; readonly stderr: string }>;

/** Asks the service itself whether a value works. `undefined` is yes. */
export type Probe = (name: string, values: Values) => Promise<Problem | undefined>;

export interface CredentialsDependencies {
  readonly store: Store;
  readonly probe: Probe;
  /** The text of `live/github-app-manifest.json`. */
  readonly manifest: string;
  /** Base64 of that many random bytes. */
  readonly random: (bytes: number) => string;
  /** A private key as PKCS #8 PEM, whatever form GitHub gave it in. */
  readonly pkcs8: (pem: string) => string;
}

export interface Credentials {
  readonly all: readonly Credential[];
  readonly list: () => Promise<readonly Row[] | Problem>;
  /** What to ask a person for, in order: the ones from `you` that are not there. */
  readonly toAsk: () => Promise<readonly Credential[] | Problem>;
  /** The page to get this one on, with what is known filled in. */
  readonly page: (one: Credential) => Promise<string | undefined>;
  /** The names this one still waits for. */
  readonly waitsFor: (one: Credential) => Promise<readonly string[] | Problem>;
  /** Checks one answer, asks the service, and keeps it with what follows from it. */
  readonly answer: (name: string, typed: string) => Promise<Written>;
  /** Makes or works out the ones nobody types. One that is there is never made again: a new master key would lose every vault. */
  readonly make: () => Promise<Written>;
  /** What the GitHub page is sent, or why it cannot be made yet. */
  readonly app: (returnTo: string) => Promise<{ readonly _tag: "Form"; readonly action: string; readonly manifest: string } | Problem>;
  /** Keeps what GitHub answered when the App was made. */
  readonly keepApp: (conversion: unknown) => Promise<Written>;
}
