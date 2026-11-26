import { prompt } from "./internal/prompt.ts";
import { talkingTo } from "./internal/talking.ts";
import type { Coworker } from "./types.ts";

export const coworker: Coworker = { talkingTo, prompt };
