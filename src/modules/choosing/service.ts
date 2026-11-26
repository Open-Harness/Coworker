import { choose } from "./internal/choose.ts";
import { add, parts, price, room } from "./internal/money.ts";
import type { Choosing } from "./types.ts";

export const choosing: Choosing = { choose, price, add, room, parts };
