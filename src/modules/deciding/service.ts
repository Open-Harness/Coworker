import { run } from "./internal/run.ts";
import type { Deciding, DecidingDeps } from "./types.ts";

export const createDeciding = (c: DecidingDeps): Deciding => ({ run: () => run(c) });
