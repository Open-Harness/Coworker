import type { ItemState, Kept, Us } from "../types.ts";
import { checkState } from "./checks.ts";
import { reviewsOf, talksOf } from "./reviews.ts";
import { checksOf, view, type View } from "./view.ts";

/* What is true now of one item, from the newest of each thing kept. */

function isOf(seen: View): ItemState["is"] {
  const { item, pull } = seen;
  if (item?.gone === true) return "gone";
  if (pull?.merged === true) return "merged";
  if (item !== undefined && !item.open) return "closed";
  return pull?.draft === true ? "draft" : "open";
}

export function stateOf(kept: Kept, number: number, us: Us): ItemState | undefined {
  const seen = view(kept, number);
  const { item, pull } = seen;
  if (item === undefined && pull === undefined) return undefined;
  const head = pull?.head.sha ?? null;
  const checkRecords = head === null ? [] : checksOf(kept, head);
  const checks = checkState(checkRecords);
  const reviews = reviewsOf(seen.reviews, head);
  const talks = talksOf(seen.lines, seen.talks, us);
  const is = isOf(seen);
  const isPull = item?.pull ?? pull !== undefined;
  const merge = pull?.mergeable === true ? "clean" : pull?.mergeable === false ? "conflict" : "unknown";
  const sure =
    !seen.all.some((one) => "tied" in one) &&
    !checkRecords.some((one) => "tied" in one) &&
    (!isPull || pull !== undefined) &&
    item !== undefined;
  return {
    number,
    pull: isPull,
    is,
    closedAs: item?.closedAs ?? null,
    labels: item?.labels ?? [],
    head,
    merge,
    checks,
    reviews,
    talks: talks.open,
    waits: waitsFor({ is, isPull, merge, checks: checks.is, reviews, talks }),
    sure,
  };
}

interface Facts {
  readonly is: ItemState["is"];
  readonly isPull: boolean;
  readonly merge: ItemState["merge"];
  readonly checks: ItemState["checks"]["is"];
  readonly reviews: ItemState["reviews"];
  readonly talks: ReturnType<typeof talksOf>;
}

function waitsFor({ is, isPull, merge, checks, reviews, talks }: Facts): ItemState["waits"] {
  if (is === "merged" || is === "closed" || is === "gone") return "nothing";
  if (!isPull || is === "draft") return "us";
  if (checks === "failed" || merge === "conflict" || talks.waitsForUs || reviews.some((one) => one.says === "changes" && one.onHead))
    return "us";
  if (checks === "running") return "checks";
  return reviews.some((one) => one.says === "approved" && one.onHead) ? "merge" : "review";
}
