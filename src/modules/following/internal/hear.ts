import { githubEvents } from "~/modules/github-events/service.ts";
import type { CheckRecord, ItemRecord, Kept, PullRecord, Told, Us } from "~/modules/github-events/types.ts";
import type { FollowDeps, Heard, News } from "../types.ts";

/* One delivery, or one answer of GitHub: its records are kept, and what became true because of them is made news. */

/** The names of the checks that passed on a commit: the newest run of each. */
export function passedAt(kept: Kept, sha: string): readonly string[] {
  const runs = Object.values(kept)
    .filter((one): one is CheckRecord => one.is === "check" && one.sha === sha)
    .toSorted((a, b) => a.id - b.id);
  const newest = new Map<string, CheckRecord>();
  for (const run of runs) newest.set(`${run.app}:${run.name}`, run);
  return [...newest.values()].filter((run) => run.ended === "passed").map((run) => run.name);
}

/** The pull requests that are open in what is kept. */
export function openPulls(kept: Kept): readonly number[] {
  const all = Object.values(kept);
  const items = all.filter((one): one is ItemRecord => one.is === "item");
  return all
    .filter((one): one is PullRecord => one.is === "pull" && !one.merged && items.find((item) => item.number === one.number)?.open === true)
    .map((one) => one.number);
}

const newsOf = (repo: string, number: number, told: Told, after: Kept, since: number, asked: boolean): News => ({
  id: `${repo}#${number}:${told.key}`,
  repo,
  number,
  told,
  passed: told.is === "checked" && told.ended === "passed" ? passedAt(after, told.sha) : [],
  since,
  asked,
});

/** Keeps the records, and makes news of what became true for each conversation they are about. Answers the news, for the caller to see. */
export function keepAndTell(
  c: FollowDeps,
  repo: string,
  records: Heard["records"],
  numbers: readonly number[],
  sha: string | null,
  us: Us,
  asked: boolean,
): readonly News[] {
  const before = c.store.kept(repo);
  const after = githubEvents.keep(before, records);
  c.store.keep(repo, after);
  const about = [...new Set([...numbers, ...(sha === null ? [] : githubEvents.withHead(after, sha))])];
  const news = about.flatMap((number) => githubEvents.told(before, after, number, us).map((told) => newsOf(repo, number, told, after, c.clock.now(), asked)));
  c.store.addNews(news);
  return news;
}

export function hear(c: FollowDeps, heard: Heard): void {
  keepAndTell(c, heard.repo, heard.records, heard.numbers, heard.sha, heard.us, false);
  // A push to the default branch may leave a pull request that no longer merges, and a delivery never says so: GitHub is asked.
  if (heard.event !== "push") return;
  const since = c.clock.now();
  for (const number of openPulls(c.store.kept(heard.repo))) c.store.want({ repo: heard.repo, number, us: heard.us, since, all: false });
}

export function back(c: FollowDeps, us: Us): void {
  const since = c.clock.now();
  for (const repo of c.store.repos()) c.store.want({ repo, number: 0, us, since, all: true });
}
