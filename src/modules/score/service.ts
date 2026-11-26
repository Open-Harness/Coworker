import { isEvalName, parseBook } from "./internal/book.ts";
import { brokenSupport, describeProblem, judge, table, tierOf } from "./internal/judge.ts";
import { readPlaywright, readVitest } from "./internal/reports.ts";
import type { Score } from "./types.ts";

export const score: Score = { parseBook, isEvalName, tierOf, brokenSupport, judge, readVitest, readPlaywright, table, describeProblem };
