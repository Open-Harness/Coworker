import { back, hear } from "./internal/hear.ts";
import { run } from "./internal/run.ts";
import type { Following, FollowDeps } from "./types.ts";

export const createFollowing = (c: FollowDeps): Following => ({
  hear: (heard) => hear(c, heard),
  back: (us) => back(c, us),
  run: () => run(c),
});
