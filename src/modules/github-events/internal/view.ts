import type { CheckRecord, CommentRecord, ItemRecord, Kept, LineRecord, PullRecord, ReviewRecord, TalkRecord } from "../types.ts";
import type { GithubRecord } from "../records.ts";

/* What is kept of one item, by kind. */

export interface View {
  readonly item: ItemRecord | undefined;
  readonly pull: PullRecord | undefined;
  readonly comments: readonly CommentRecord[];
  readonly lines: readonly LineRecord[];
  readonly reviews: readonly ReviewRecord[];
  readonly talks: readonly TalkRecord[];
  readonly all: readonly GithubRecord[];
}

const of = <K extends GithubRecord["is"]>(all: readonly GithubRecord[], is: K): readonly Extract<GithubRecord, { is: K }>[] =>
  all.filter((one): one is Extract<GithubRecord, { is: K }> => one.is === is);

export function view(kept: Kept, number: number): View {
  const all = Object.values(kept).filter((one) => "number" in one && one.number === number);
  return {
    item: of(all, "item")[0],
    pull: of(all, "pull")[0],
    comments: of(all, "comment"),
    lines: of(all, "line"),
    reviews: of(all, "review"),
    talks: of(all, "talk"),
    all,
  };
}

export const checksOf = (kept: Kept, sha: string): readonly CheckRecord[] =>
  of(Object.values(kept), "check").filter((one) => one.sha === sha);
export const openPulls = (kept: Kept): readonly PullRecord[] => {
  const items = of(Object.values(kept), "item");
  return of(Object.values(kept), "pull").filter((pull) => items.find((item) => item.number === pull.number)?.open === true && !pull.merged);
};
