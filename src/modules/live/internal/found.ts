import type { Filling, Found } from "../types.ts";

export const DATABASE = "coworker-control-staging";
export const BUCKET = "coworker-files-staging";
/** The Worker with the two outside people's mailboxes. */
export const MAILBOX = "coworker-mailbox";
export const WORKER = "coworker-staging";
/** The address of the live tier's manager `launch`, of the workspace `live`. */
export const managerOn = (domain: string): string => `launch.live@${domain}`;
/** An account has one secrets store, shared with whatever else it runs, so the key's name says whose it is. */
export const MASTER_KEY = "coworker-staging-vault-master-key";

interface Database {
  readonly name?: unknown;
  readonly uuid?: unknown;
}

function databaseId(json: string): string | undefined {
  try {
    const all: unknown = JSON.parse(json);
    const ours = Array.isArray(all) ? (all as readonly Database[]).find(({ name }) => name === DATABASE) : undefined;
    return typeof ours?.uuid === "string" ? ours.uuid : undefined;
  } catch {
    return undefined;
  }
}

/** The addresses with a rule of their own, switched on, that goes to this Worker. */
const addressesTo = (worker: string, rules: string): readonly string[] =>
  rules.split(/^Rule: /mu).flatMap((rule) => {
    const ours = /^\s*Enabled:\s+true$/mu.test(rule) && new RegExp(`^\\s*Actions:\\s+worker:${worker}$`, "mu").test(rule);
    const address = /^\s*Matchers:\s+to:(\S+)$/mu.exec(rule)?.[1];
    return ours && address !== undefined ? [address.toLowerCase()] : [];
  });

interface Printed {
  readonly whoami?: string;
  readonly databases: string;
  readonly stores: string;
  readonly buckets: string;
  readonly secrets: string;
  readonly rules: string;
}

/** The id in `whoami`'s table. With several accounts none is guessed. */
function onlyAccount(whoami: string): string | undefined {
  const ids = new Set([...whoami.matchAll(/│\s*([0-9a-f]{32})\s*│/gu)].map((row) => row[1]));
  return ids.size === 1 ? [...ids][0] : undefined;
}

/** Reads what wrangler printed: `whoami`, `d1 list --json`, and the lists of stores, buckets, secrets and routing rules. */
export function found(printed: Printed): Found {
  return {
    accountId: onlyAccount(printed.whoami ?? ""),
    databaseId: databaseId(printed.databases),
    storeId: /│\s*([0-9a-f]{32})\s*│/u.exec(printed.stores)?.[1],
    bucket: new RegExp(`^name:\\s+${BUCKET}$`, "mu").test(printed.buckets),
    masterKey: new RegExp(`│\\s*${MASTER_KEY}\\s*│`, "u").test(printed.secrets),
    mailboxes: addressesTo(MAILBOX, printed.rules),
    manager: addressesTo(WORKER, printed.rules).some((address) => address.startsWith(managerOn(""))),
  };
}

const place = (key: string): RegExp => new RegExp(`("${key}"\\s*:\\s*)"REPLACE_AT_DEPLOY[^"]*"`, "gu");

/** Fills each placeholder there is a value for. A value already written is left alone. */
export function fill(config: string, { domain, databaseId: database, storeId, accountId }: Filling): string {
  const values: Readonly<Record<string, string | undefined>> = {
    DT_APP_URL: domain && `https://staging.${domain}`,
    DT_MAIL_DOMAIN: domain,
    MAILBOX_DOMAIN: domain,
    DT_SEND_FROM: domain && `hello@${domain}`,
    database_id: database,
    store_id: storeId,
  };
  const registry =
    accountId === undefined
      ? config
      : config.replaceAll("registry.cloudflare.com/REPLACE_AT_DEPLOY/", `registry.cloudflare.com/${accountId}/`);
  const simple = Object.entries(values).reduce(
    (text, [key, value]) => (value === undefined || value === "" ? text : text.replace(place(key), `$1"${value}"`)),
    registry,
  );
  // A route's placeholder says which name of the domain it is: `staging.<test domain>`, `mailbox.<test domain>`.
  return domain === undefined || domain === ""
    ? simple
    : simple.replace(/("pattern"\s*:\s*)"REPLACE_AT_DEPLOY:([a-z-]+)\.<test domain>"/gu, `$1"$2.${domain}"`);
}
