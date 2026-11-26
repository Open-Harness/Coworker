import type { ScreenRoute } from "~/modules/page/types.ts";

/** Making a manager: where from, the blanks of a template, and what it found when it tried them. */
export default [
  { path: "/managers/new" },
  { path: "/managers/new/:template" },
  { path: "/managers/new/:template/check" },
] satisfies ScreenRoute[];
