import { ask } from "./internal/ask.ts";
import { pick } from "./internal/pick.ts";
import type { Completion } from "./types.ts";

export const completion: Completion = { ask, pick };
