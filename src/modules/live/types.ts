/*
 * The live tier's settings and its setup plan (book section 3). Pure: the composition roots (`vitest.live.config.ts`,
 * `src/bin/score.ts`, `scripts/staging.ts`) read the environment and files, and give them here as values.
 *
 * A live test names exactly its eval id. Without every setting it needs it is skipped, which is neither a pass nor a
 * fail, and the names that are missing are printed.
 */

export const LIVE_IDS = ["live:email/round-trip", "live:email/stranger", "live:github/round-trip", "live:sandbox/clone-test"] as const;
export type LiveId = (typeof LIVE_IDS)[number];

/** Settings as the runner has them: unset and empty both mean "not there". */
export type Settings = Readonly<Record<string, string | undefined>>;

export interface Skipped {
  readonly id: LiveId;
  readonly missing: readonly string[];
}

/** One thing to do to set up staging. A `command` is a program and its arguments; a `manual` step is done by a person. */
export type Step =
  | {
      readonly kind: "command";
      readonly phase: "create" | "deploy";
      readonly title: string;
      readonly argv: readonly string[];
      /**
       * Settings this command is given on its standard input, so a value is never an argument: one as it is, several as
       * JSON. It waits until they are all there.
       */
      readonly stdin?: readonly string[];
      /** Extra environment for this command only. Never a secret. */
      readonly env?: Readonly<Record<string, string>>;
      readonly note?: string;
    }
  | { readonly kind: "manual"; readonly title: string; readonly note: string };

export interface PlanInput {
  /** The text of `wrangler.jsonc`. */
  readonly config: string;
  readonly settings: Settings;
  /** Whether wrangler is signed in on this computer, which is enough without CLOUDFLARE_API_TOKEN. */
  readonly signedIn?: boolean;
  /** What the account has already. A step whose thing is there is left out, so the setup can be run again. */
  readonly found?: Found;
}

/** What `wrangler` said the account has. */
export interface Found {
  /** The account, when wrangler is signed in to exactly one. */
  readonly accountId?: string | undefined;
  readonly databaseId?: string | undefined;
  readonly storeId?: string | undefined;
  readonly bucket?: boolean;
  readonly masterKey?: boolean;
  /** Addresses whose own routing rule sends their mail to `coworker-mailbox`. */
  readonly mailboxes?: readonly string[];
  /** Whether the test manager's own address has a rule that sends its mail to `coworker-staging`. */
  readonly manager?: boolean;
}

/** What fills the placeholders of the three wrangler files. */
export interface Filling {
  readonly domain?: string | undefined;
  readonly databaseId?: string | undefined;
  readonly storeId?: string | undefined;
  readonly accountId?: string | undefined;
}

export interface Plan {
  readonly steps: readonly Step[];
  /** Placeholders (`REPLACE_AT_DEPLOY`) still in the staging block of the config, by the setting they stand for. */
  readonly placeholders: readonly string[];
  /** Why nothing may run at all (no way into Cloudflare). Empty when the `create` phase may run. */
  readonly blockers: readonly string[];
  /** Settings a step needs on its standard input that are not there. The steps that need them wait. */
  readonly absent: readonly string[];
}

/** The part of `fetch` a copy uses. */
export type RegistryFetch = (url: string, init: RequestInit) => Promise<Response>;

export type Copied = { readonly _tag: "Copied"; readonly blobs: number } | { readonly _tag: "Failed"; readonly reason: string };

export type CopyImage = (input: {
  readonly fetch: RegistryFetch;
  /** The Docker Hub repository it comes from. */
  readonly source: string;
  /** The repository it goes to: `https://registry.cloudflare.com/v2/<account>/<name>`. */
  readonly target: string;
  readonly digest: string;
  readonly credentials: { readonly username: string; readonly password: string };
  /** Told each part that is being copied. */
  readonly said: (line: string) => void;
}) => Promise<Copied>;

export interface Live {
  /** Every setting a live test or the setup may read, with what it is for. Names only; never values. */
  readonly settings: readonly { readonly name: string; readonly about: string }[];
  readonly needs: (id: LiveId) => readonly string[];
  /** The names this eval needs that `settings` lacks. */
  readonly missing: (id: LiveId, settings: Settings) => readonly string[];
  /** Every live eval that cannot run, with what it lacks. */
  readonly skipped: (settings: Settings) => readonly Skipped[];
  readonly plan: (input: PlanInput) => Plan;
  /** The test domain, from LIVE_STAGING_URL. */
  readonly domain: (settings: Settings) => string | undefined;
  /** A wrangler file with the placeholders it can fill filled in, comments and all. */
  readonly fill: (config: string, filling: Filling) => string;
  /** What these commands printed, as what the account has. */
  readonly found: (printed: {
    readonly whoami?: string;
    readonly databases: string;
    readonly stores: string;
    readonly buckets: string;
    readonly secrets: string;
    readonly rules: string;
  }) => Found;
  /** The image sandboxes start from, as a wrangler file names it: in Cloudflare's registry, by its digest. */
  readonly imageIn: (config: string) => { readonly host: string; readonly repository: string; readonly digest: string } | undefined;
  /** Copies an image from Docker Hub into Cloudflare's registry. Blobs that are there are not sent again. */
  readonly copyImage: CopyImage;
  /** The plan as text: what `pnpm staging` prints. */
  readonly describe: (plan: Plan, apply: boolean) => string;
  /** What `pnpm staging --apply` may run now: the `create` steps always, the `deploy` ones once no placeholder is left. */
  readonly runnable: (plan: Plan) => readonly Extract<Step, { kind: "command" }>[];
}
