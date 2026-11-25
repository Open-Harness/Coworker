import { accept } from "./internal/answers.ts";
import { AFTER, CATALOGUE, FOLLOWS } from "./internal/catalogue.ts";
import { manifestFor, settingsOf } from "./internal/github-app.ts";
import type { Credentials, CredentialsDependencies, Problem, Values, Written } from "./types.ts";

export { bitwarden, ITEM } from "./internal/bitwarden.ts";
export { ensureRepo } from "./internal/repo.ts";
export { liveProbe } from "./internal/probe.ts";

/** 32 bytes for the vault's key, which must be exactly that. */
const MADE: readonly (readonly [string, number])[] = [
  ["BETTER_AUTH_SECRET", 48],
  ["VAULT_MASTER_KEY", 32],
  ["LIVE_MAILBOX_TOKEN", 32],
];

export const isProblem = (value: unknown): value is Problem =>
  typeof value === "object" && value !== null && "_tag" in value && value._tag === "Problem";

async function keepAnswer({ store, probe }: CredentialsDependencies, name: string, typed: string): Promise<Written> {
  const accepted = accept(name, typed);
  if (isProblem(accepted)) return accepted;
  const had = await store.read();
  if (isProblem(had)) return had;
  const answered: Values = { [name]: accepted.value, ...FOLLOWS[name]?.(accepted.value) };
  const refused = await probe(name, { ...had, ...answered });
  return refused ?? store.write(answered);
}

async function makeMissing({ store, random }: CredentialsDependencies): Promise<Written> {
  const had = await store.read();
  if (isProblem(had)) return had;
  const lacks = ([name]: readonly [string, unknown]): boolean => (had[name] ?? "") === "";
  const made = MADE.filter(lacks).map(([name, bytes]) => [name, random(bytes)] as const);
  // What follows from an answer kept before there was anything to follow from it. The mailboxes can only be the ones we make.
  const follows = Object.entries(FOLLOWS).flatMap(([name, from]) => Object.entries(lacks([name, undefined]) ? {} : from(had[name] ?? "")));
  const missing = Object.fromEntries([
    ...made,
    ...follows.filter((one) => lacks(one) || (one[0].endsWith("_MAILBOX") && had[one[0]] !== one[1])),
  ]);
  return Object.keys(missing).length === 0 ? { _tag: "Written", names: [] } : store.write(missing);
}

async function appForm({ store, manifest }: CredentialsDependencies, returnTo: string): ReturnType<Credentials["app"]> {
  const had = await store.read();
  if (isProblem(had)) return had;
  const org = had["TEST_ORG"] ?? "";
  const url = had["LIVE_STAGING_URL"] ?? "";
  if (org === "" || url === "") return { _tag: "Problem", reason: "The App needs the test domain and the organization first" };
  return {
    _tag: "Form",
    action: `https://github.com/organizations/${org}/settings/apps/new`,
    manifest: manifestFor(manifest, url, returnTo),
  };
}

export function createCredentials(deps: CredentialsDependencies): Credentials {
  const there = async () => {
    const had = await deps.store.read();
    return isProblem(had) ? had : CATALOGUE.map((one) => ({ one, there: (had[one.name] ?? "") !== "" }));
  };
  return {
    all: CATALOGUE,
    list: async () => {
      const rows = await there();
      return isProblem(rows) ? rows : rows.map(({ one, there }) => ({ name: one.name, about: one.about, source: one.source._tag, there }));
    },
    toAsk: async () => {
      const rows = await there();
      return isProblem(rows) ? rows : rows.flatMap(({ one, there }) => (one.source._tag === "You" && !there ? [one] : []));
    },
    page: async ({ source }) => {
      const had = await deps.store.read();
      if (source._tag !== "You" || source.page === undefined || isProblem(had)) return undefined;
      return source.page.replace(/\{([A-Z_]+)\}/gu, (_, name: string) => encodeURIComponent(had[name] ?? ""));
    },
    waitsFor: async (one) => {
      const had = await deps.store.read();
      return isProblem(had) ? had : (AFTER[one.name] ?? []).filter((name) => (had[name] ?? "") === "");
    },
    answer: (name, typed) => keepAnswer(deps, name, typed),
    make: () => makeMissing(deps),
    app: (returnTo) => appForm(deps, returnTo),
    keepApp: async (conversion) => {
      const values = settingsOf(conversion, deps.pkcs8);
      return isProblem(values) ? values : deps.store.write(values);
    },
  };
}
