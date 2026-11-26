import { describe, expect, it } from "vitest";
import type { GithubRecord, Kept, Us } from "~/modules/github-events/types.ts";
import type { OpenWork } from "~/modules/intake/types.ts";
import type { WorkEvent } from "~/modules/work/types.ts";
import { createFollowing } from "./service.ts";
import type { FollowStore, Listener, News, Wanted } from "./types.ts";

const us: Us = { login: "juno-test[bot]", mention: "@juno-test", label: "juno" };
const ama = { login: "ama", id: 1, bot: false };
const at = Date.parse("2026-11-26T10:00:00Z");

const item = (number: number, open: boolean, seconds: number): GithubRecord => ({
  is: "item",
  at: at + seconds * 1000,
  rank: open ? 0 : 1,
  number,
  pull: number === 2,
  open,
  closedAs: null,
  title: "add.sh subtracts",
  body: "Closes #1",
  labels: [],
  assignees: [],
  by: ama,
  gone: false,
});
const pull = (merged: boolean, seconds: number, mergeable: boolean | null = null): GithubRecord => ({
  is: "pull",
  at: at + seconds * 1000,
  rank: merged ? 1 : 0,
  number: 2,
  draft: false,
  merged,
  mergedBy: merged ? ama : null,
  mergeSha: null,
  head: { ref: "co-worker/work", sha: "abc1234", repo: null },
  base: { ref: "main", sha: "000" },
  mergeable,
  asked: [],
});

function world(answer: unknown = undefined) {
  const [kept, news, wanted, heard] = [
    new Map<string, Kept>(),
    new Map<string, { news: News; told: boolean }>(),
    new Map<string, Wanted>(),
    [] as { work: string; event: WorkEvent }[],
  ];
  const store: FollowStore = {
    kept: (repo) => kept.get(repo) ?? {},
    keep: (repo, now) => void kept.set(repo, now),
    addNews: (more) => more.forEach((one) => news.has(one.id) || news.set(one.id, { news: one, told: false })),
    news: () => [...news.values()].filter(({ told }) => !told).map((one) => one.news),
    told: (id) => void (news.get(id) !== undefined && (news.get(id)!.told = true)),
    want: (one) => {
      const was = wanted.get(`${one.repo}#${one.number}`);
      wanted.set(`${one.repo}#${one.number}`, { ...one, all: one.all || was?.all === true });
    },
    wanted: () => [...wanted.values()],
    got: (repo, number, since) => {
      if ((wanted.get(`${repo}#${number}`)?.since ?? 0) <= since) wanted.delete(`${repo}#${number}`);
    },
    repos: () => [...kept.keys()],
  };
  const open: OpenWork = {
    id: "work_1",
    manager: "m",
    kind: "bug",
    title: "add.sh subtracts",
    follows: ["github:acme/web#1", "github:acme/web#2"],
  };
  const listener: Listener = { open: async () => [open], news: async ({ work, event }) => void heard.push({ work, event }) };
  const following = createFollowing({
    store,
    listeners: async () => [listener],
    read: async () => answer,
    clock: { now: () => at + 60_000 },
  });
  return { following, heard, wanted };
}
const hear = (records: readonly GithubRecord[], numbers: readonly number[], event = "pull_request", sha: string | null = null) => ({
  repo: "acme/web",
  event,
  records,
  numbers,
  sha,
  us,
});

describe("following", () => {
  it("tells the work once that its pull request was merged, in whatever order and however often it was heard", async () => {
    const { following, heard } = world();
    following.hear(hear([item(1, true, 0)], [1], "issue"));
    following.hear(hear([item(2, true, 1), pull(false, 1)], [2]));
    following.hear(hear([item(1, false, 9)], [1], "closed"));
    following.hear(hear([item(2, false, 8), pull(true, 8)], [2], "merged"));
    following.hear(hear([item(2, false, 8), pull(true, 8)], [2], "merged"));
    await following.run();
    await following.run();
    const ends = heard.filter(({ event }) => event.is === "finished outside");
    expect(ends).toHaveLength(1);
    expect(ends[0]?.event).toMatchObject({ as: "done", says: "Merged #2 by ama." });
  });

  it("asks GitHub after a push, and tells the work that its pull request no longer merges", async () => {
    const { following, heard, wanted } = world({
      number: 2,
      state: "open",
      title: "x",
      body: "",
      updated_at: "2026-11-26T10:00:01Z",
      head: { sha: "abc1234", ref: "co-worker/work" },
      base: { sha: "000", ref: "main" },
      mergeable: false,
    });
    following.hear(hear([item(2, true, 1), pull(false, 1)], [2]));
    expect(wanted.size).toBe(0);
    following.hear({ ...hear([], [], "push"), event: "push" });
    expect(wanted.size).toBe(1);
    await following.run();
    expect(heard.some(({ event }) => event.is === "heard" && event.event === "conflict")).toBe(true);
  });
});
