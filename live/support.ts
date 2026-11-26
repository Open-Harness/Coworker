import { it } from "vitest";
import { live } from "~/modules/live/service.ts";
import type { LiveId } from "~/modules/live/types.ts";
import { isFailed, liveApp, type Provisioned, type Session } from "~/modules/liveapp/service.ts";
import { isFailure, outsiders } from "~/modules/outsiders/service.ts";
import type { MailPerson, Polling } from "~/modules/outsiders/types.ts";

/*
 * What the live tests share. The live runner's composition root is `vitest.live.config.ts` (it loads the settings into
 * the environment); a test reads them from here. Tests of the live tier live in `live/*.live.test.ts` and are not run by
 * `pnpm test` or `pnpm score`.
 */

export const setting = (name: string): string => process.env[name] ?? "";

/** A test named exactly its eval id: skipped unless every setting it needs is there (the runner prints which are missing). */
export function liveIt(id: LiveId, run: () => Promise<void>, timeoutMs: number): void {
  it.skipIf(live.missing(id, process.env).length > 0)(id, run, timeoutMs);
}

export const realTime: Polling = {
  withinMs: 60_000,
  everyMs: 3_000,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => Date.now(),
};

/** What is left of a deadline that began at `started`. */
export const within = (started: number, ms: number): number => Math.max(1_000, ms - (Date.now() - started));

export const mailPerson = (address: string): MailPerson =>
  outsiders.mailboxPerson(
    { url: setting("LIVE_MAILBOX_URL"), token: setting("LIVE_MAILBOX_TOKEN"), address },
    (url, init) => fetch(url, init),
    realTime,
  );

export const gitPerson = () => outsiders.githubPerson({ token: setting("GH_PERSON_TOKEN") }, (url, init) => fetch(url, init));

export interface Staging {
  readonly session: Session;
  readonly live: Provisioned;
  /** The allowed person: also the test workspace's Owner. */
  readonly owner: MailPerson;
}

const connected = new Map<string, Promise<Staging>>();

async function connect(github: boolean, sandbox: boolean): Promise<Staging> {
  const address = setting("LIVE_ALLOWED_MAILBOX");
  const owner = mailPerson(address);
  const baseUrl = setting("LIVE_STAGING_URL").replace(/\/$/u, "");
  // Signs in for real: the app emails the Owner a link, and the runner reads it from the Owner's own mailbox.
  const session = await liveApp.signIn({
    baseUrl,
    fetch: (url, init) => fetch(url, init),
    email: address,
    name: "Live runner",
    obtainLink: (request) => outsiders.linkAfter(owner, "Your sign-in link", request, { ...realTime, withinMs: 90_000 }),
  });
  if (isFailed(session)) throw new Error(session.reason);
  const me = github ? await gitPerson().whoami() : undefined;
  if (me !== undefined && isFailure(me)) throw new Error(me.reason);
  const key = setting("FAKE_MODEL_KEY");
  const seeded = await liveApp.provision(session, {
    workspace: { address: "live", name: "Live tests" },
    endpoint: { label: "coworker-fake-model", baseUrl: setting("LIVE_FAKE_MODEL_URL"), ...(key === "" ? {} : { key }) },
    manager: { name: "launch", address: "launch" },
    allow: { emails: [address], githubIds: me === undefined ? [] : [String(me.id)] },
    ...(github ? { repo: setting("LIVE_GITHUB_REPO") } : {}),
    ...(sandbox ? { environment: "app" } : {}),
  });
  if (isFailed(seeded)) throw new Error(seeded.reason);
  return { session, live: seeded, owner };
}

/** Signed in to staging as its test Owner, with the test workspace set up (once per kind of test in a run). */
export function staging(options: { github?: boolean; sandbox?: boolean } = {}): Promise<Staging> {
  const key = JSON.stringify([options.github === true, options.sandbox === true]);
  const found = connected.get(key);
  if (found !== undefined) return found;
  const made = connect(options.github === true, options.sandbox === true);
  connected.set(key, made);
  return made;
}

/** Waits for something to show on the board, in Events or in a run, up to the time left of a deadline. */
export const until = <T>(read: () => Promise<T | undefined>, ms: number): Promise<T | undefined> =>
  outsiders.eventually(read, { ...realTime, withinMs: ms, everyMs: 2_000 });
