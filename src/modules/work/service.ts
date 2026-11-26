import { columns } from "./internal/columns.ts";
import { isDone } from "./internal/evidence.ts";
import { move } from "./internal/move.ts";
import { says } from "./internal/says.ts";
import { stepOf } from "./internal/steps.ts";
import { take } from "./internal/take.ts";
import type { Works } from "./types.ts";

export const works: Works = { take, move, columns, stepOf, isDone, says };
