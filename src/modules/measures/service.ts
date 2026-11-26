import { lineAt } from "./internal/line.ts";
import { lost } from "./internal/lost.ts";
import { needsALook } from "./internal/look.ts";
import { mayBe } from "./internal/may-be.ts";
import { standing } from "./internal/standing.ts";
import { worse } from "./internal/worse.ts";
import type { Measures } from "./types.ts";

export const measures: Measures = { line: lineAt, standing, worse, lost, needsALook, mayBe };
