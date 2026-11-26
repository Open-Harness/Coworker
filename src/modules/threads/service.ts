import { evidence } from "./internal/evidence.ts";
import { offer } from "./internal/offer.ts";
import { prompt } from "./internal/prompt.ts";
import { read } from "./internal/read.ts";
import type { Threads } from "./types.ts";

export const threads: Threads = { prompt, offer, read, evidence };
