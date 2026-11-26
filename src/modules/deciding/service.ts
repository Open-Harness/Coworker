import { run } from "./internal/run.ts";
import type { Deciding, DecidingDeps } from "./types.ts";

/** One judgement of one item, as the deciding of what came in asks it: also how a change to the judge's words is tried. */
export { judge as askJudge } from "./internal/judge.ts";

export const createDeciding = (c: DecidingDeps): Deciding => ({ run: () => run(c) });
