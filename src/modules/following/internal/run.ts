import { githubEvents } from "~/modules/github-events/service.ts";
import type { ThreadRef } from "~/modules/work/types.ts";
import type { FollowDeps, News, Wanted } from "../types.ts";
import { toWork } from "./events.ts";
import { keepAndTell } from "./hear.ts";

/** How long news that nobody follows, or a conversation that cannot be asked about, is kept before it is let go of. */
const STALE = 60_000;
const SOON = 5_000;

/** What GitHub says of one conversation, as the records a delivery would have carried. `undefined`: it cannot be asked now. */
async function askedAbout(c: FollowDeps, repo: string, number: number, all: boolean) {
  const [issue, pull] = await Promise.all([c.read(repo, `/issues/${number}`), c.read(repo, `/pulls/${number}`)]);
  if (issue === undefined && pull === undefined) return undefined;
  if (!all) return githubEvents.asked(number, { pull }, 0);
  const sha = typeof pull === "object" && pull !== null && "head" in pull ? (pull.head as { sha?: unknown }).sha : undefined;
  const [comments, reviews, lines, checks] = await Promise.all([
    c.read(repo, `/issues/${number}/comments`),
    pull === undefined ? undefined : c.read(repo, `/pulls/${number}/reviews`),
    pull === undefined ? undefined : c.read(repo, `/pulls/${number}/comments`),
    typeof sha === "string" ? c.read(repo, `/commits/${sha}/check-runs`) : undefined,
  ]);
  return githubEvents.asked(number, { issue, pull, comments, reviews, lines, checks }, 0);
}

/** A conversation GitHub is asked about: its answer is the same records as a delivery, and the same path keeps them. */
async function refresh(c: FollowDeps, wanted: Wanted, number: number): Promise<boolean> {
  const records = await askedAbout(c, wanted.repo, number, wanted.all);
  if (records === undefined) return false;
  // Not stamped as newer than what a delivery said: a delivery that comes after it is not lost to it.
  keepAndTell(c, wanted.repo, records, [number], null, wanted.us, wanted.all);
  return true;
}

/** Every conversation of a repo that some work follows. */
async function followed(c: FollowDeps, repo: string): Promise<readonly number[]> {
  const found = new Set<number>();
  for (const listener of await c.listeners(repo))
    for (const work of await listener.open())
      for (const thread of work.follows) {
        const number = Number(thread.slice(thread.lastIndexOf("#") + 1));
        if (thread.startsWith(`github:${repo}#`) && Number.isFinite(number)) found.add(number);
      }
  return [...found];
}

async function ask(c: FollowDeps, wanted: Wanted): Promise<void> {
  const numbers = wanted.number === 0 ? await followed(c, wanted.repo) : [wanted.number];
  const answered = await Promise.all(numbers.map((number) => refresh(c, wanted, number)));
  if (answered.every(Boolean) || c.clock.now() - wanted.since > STALE) c.store.got(wanted.repo, wanted.number);
}

/** Tells each piece of work that follows the conversation what became true. `false`: nobody followed it yet. */
async function tell(c: FollowDeps, news: News): Promise<boolean> {
  const thread = `github:${news.repo}#${news.number}`;
  const ref: ThreadRef = { connector: "github", account: "github", place: news.repo, id: String(news.number) };
  let found = false;
  for (const listener of await c.listeners(news.repo)) {
    for (const work of await listener.open()) {
      const at = work.follows.indexOf(thread);
      if (at < 0) continue;
      found = true;
      for (const one of toWork(news, ref, at === 0, work.follows.length > 1)) await listener.news({ work: work.id, ...one });
    }
  }
  return found;
}

export async function run(c: FollowDeps): Promise<{ readonly again: number | null }> {
  for (const wanted of c.store.wanted()) await ask(c, wanted).catch(() => undefined);
  let owed = c.store.wanted().length > 0;
  for (const news of c.store.news()) {
    const found = await tell(c, news).catch(() => false);
    if (found || c.clock.now() - news.since > STALE) c.store.told(news.id);
    else owed = true;
  }
  return { again: owed ? c.clock.now() + SOON : null };
}
