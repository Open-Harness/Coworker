import type { RepoItem } from "~/modules/views-connector/types.ts";
import { at } from "./read.ts";

/* The pull request and issue rows of acme/web, and the one that is open: #418. */

type More = Partial<RepoItem> & Pick<RepoItem, "waits" | "says">;
export const item = (
  number: number,
  is: RepoItem["is"],
  title: string,
  state: RepoItem["state"],
  by: string,
  opened: string,
  updated: string,
  work: string,
  labels: readonly string[],
  more: More,
): RepoItem => ({
  number,
  is,
  title,
  state,
  labels,
  by,
  at: at(updated),
  work,
  closes: null,
  fixedBy: null,
  into: null,
  opened: at(opened),
  checks: null,
  openComments: 0,
  ...more,
});

export const ITEM_418 = item(
  418,
  "pull request",
  "Stream exports in pages",
  "open",
  "Juno",
  "24 Nov 10:23",
  "25 Nov 09:48",
  "ACME-412",
  ["bug"],
  {
    waits: "us",
    says: "Coding answers 1 review comment",
    closes: 412,
    checks: "passed",
    openComments: 1,
  },
);
