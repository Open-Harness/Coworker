import { asked } from "./internal/asked.ts";
import { closes } from "./internal/closes.ts";
import { keep } from "./internal/keep.ts";
import { read } from "./internal/read.ts";
import { stateOf } from "./internal/state.ts";
import { told } from "./internal/told.ts";
import { asWork } from "./internal/work.ts";
import { openPulls } from "./internal/view.ts";
import type { GithubEvents } from "./types.ts";

export const githubEvents: GithubEvents = {
  read,
  asked,
  keep,
  stateOf,
  told,
  withHead: (kept, sha) =>
    openPulls(kept)
      .filter((pull) => pull.head.sha === sha)
      .map((pull) => pull.number)
      .toSorted((a, b) => a - b),
  closes,
  asWork,
};
