import type { Found, Plan, PlanInput, Settings, Step } from "../types.ts";
import { BUCKET, DATABASE, MASTER_KEY, WORKER } from "./found.ts";
import { mailboxSteps } from "./mailboxes.ts";

const PLACEHOLDER = /"([A-Za-z_]+)"\s*:\s*"[^"]*REPLACE_AT_DEPLOY[^"]*"/gu;
/** Secrets the staging Worker reads: names only. `scripts/staging.ts` gives their values to wrangler on its standard input. */
const WORKER_SECRETS = [
  "BETTER_AUTH_SECRET",
  "GITHUB_APP_ID",
  "GITHUB_APP_SLUG",
  "GITHUB_APP_PRIVATE_KEY",
  "GITHUB_APP_CLIENT_ID",
  "GITHUB_APP_CLIENT_SECRET",
  "GITHUB_WEBHOOK_SECRET",
] as const;

/** The staging block of the config: everything from `"staging"` on. */
const stagingBlock = (config: string): string => config.slice(Math.max(0, config.indexOf('"staging"')));

/** The settings of the staging block that are still placeholders, by their key. */
export const placeholdersIn = (config: string): readonly string[] =>
  [...stagingBlock(config).matchAll(PLACEHOLDER)].map((found) => found[1] ?? "");

const wrangler = (...args: string[]): readonly string[] => ["pnpm", "exec", "wrangler", ...args];

type Command = Extract<Step, { kind: "command" }>;

/** Without it wrangler writes what it made into `wrangler.jsonc`, as a remote binding of the local app, and reformats it. */
const OWN_CONFIG = "--update-config=false";

/** The steps that make what the account does not have yet. */
function creating(found: Found): readonly Step[] {
  const create = (title: string, ...args: string[]): Command => ({ kind: "command", phase: "create", title, argv: wrangler(...args) });
  return [
    ...(found.databaseId === undefined ? [create("Create the control-plane database", "d1", "create", DATABASE, OWN_CONFIG)] : []),
    ...(found.bucket === true ? [] : [create("Create the files bucket", "r2", "bucket", "create", BUCKET, OWN_CONFIG)]),
    ...(found.storeId === undefined
      ? [create("Create the secrets store", "secrets-store", "store", "create", "coworker-store-staging", "--remote")]
      : []),
  ];
}

/** The setup, in order. Commands are `wrangler` calls; nothing in them carries a secret value. */
function steps(storeId: string, found: Found, domain: string): readonly Step[] {
  const key: Command = {
    kind: "command",
    phase: "deploy",
    title: "Put the vault master key in the store",
    argv: wrangler("secrets-store", "secret", "create", storeId, "--name", MASTER_KEY, "--scopes", "workers", "--remote"),
    stdin: ["VAULT_MASTER_KEY"],
    note: "Done once: a key that is there is never replaced.",
  };
  return [
    ...creating(found),
    ...(found.masterKey === true ? [] : [key]),
    {
      kind: "command",
      phase: "deploy",
      title: "Copy the sandbox image to Cloudflare's registry",
      argv: ["node", "scripts/sandbox-image.ts"],
      note: "From Docker Hub, over HTTP: no Docker. It does nothing when the image is there.",
    },
    {
      kind: "command",
      phase: "deploy",
      title: "Build the Worker for staging",
      argv: ["pnpm", "build"],
      env: { CLOUDFLARE_ENV: "staging" },
      note: "The build picks the staging block of wrangler.jsonc and writes it where wrangler finds it. Run `pnpm build` again afterwards for the app's own tests.",
    },
    {
      kind: "command",
      phase: "deploy",
      title: "Create the control-plane tables",
      // Without the environment wrangler does not find the database's own migrations.
      argv: wrangler("d1", "migrations", "apply", DATABASE, "--remote", "--env", "staging"),
    },
    {
      kind: "command",
      phase: "deploy",
      title: `Deploy ${WORKER} with its containers`,
      argv: wrangler("deploy"),
    },
    {
      kind: "command",
      phase: "deploy",
      title: `Set the ${WORKER_SECRETS.length} secrets of ${WORKER}`,
      argv: wrangler("secret", "bulk", "--name", WORKER),
      stdin: WORKER_SECRETS,
    },
    {
      kind: "command",
      phase: "deploy",
      title: "Deploy coworker-fake-model",
      argv: wrangler("deploy", "--config", "wrangler.fake-model.jsonc"),
    },
    ...mailboxSteps(found, domain),
    {
      kind: "manual",
      title: "Email on the test domain",
      note: "In the Cloudflare dashboard, once: Email Routing and Email Sending on, and the catch-all sent to coworker-staging. See docs/live-setup.md step 4.",
    },
  ];
}

/** The store id written in the staging block, or `<store id>` while it is still a placeholder. */
const storeIdOf = (config: string): string => /"store_id"\s*:\s*"([^"]+)"/u.exec(stagingBlock(config))?.[1] ?? "<store id>";

/** The test domain, from where staging is. */
export const domainOf = (settings: Settings): string | undefined =>
  /^https:\/\/staging\.(.+?)\/?$/u.exec(settings["LIVE_STAGING_URL"] ?? "")?.[1];

const isThere = (settings: Settings, name: string): boolean => (settings[name] ?? "") !== "";

export function plan({ config, settings, signedIn = false, found = {} }: PlanInput): Plan {
  const blockers =
    signedIn || isThere(settings, "CLOUDFLARE_API_TOKEN")
      ? []
      : ["wrangler is not signed in (run `pnpm exec wrangler login`) and CLOUDFLARE_API_TOKEN is not set"];
  const written = storeIdOf(config);
  const all = steps(
    written.startsWith("REPLACE_AT_DEPLOY") ? (found.storeId ?? "<store id>") : written,
    found,
    domainOf(settings) ?? "<test domain>",
  );
  const wanted = all.flatMap((step) => (step.kind === "command" ? (step.stdin ?? []) : []));
  return { steps: all, placeholders: placeholdersIn(config), blockers, absent: wanted.filter((name) => !isThere(settings, name)) };
}
