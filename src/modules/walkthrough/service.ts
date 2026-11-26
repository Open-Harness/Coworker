import { because } from "./internal/because-of.ts";
import { answered, score } from "./internal/score.ts";
import { start } from "./internal/start.ts";
import { walk } from "./internal/walk.ts";
import type { Walkthroughs } from "./types.ts";

export const walkthroughs: Walkthroughs = { start, walk, answered, because, score };
