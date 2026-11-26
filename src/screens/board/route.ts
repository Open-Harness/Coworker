import type { ScreenRoute } from "~/modules/page/types.ts";

/** Any manager's board, drawn as Coding's is; a manager with a board of its own has a folder for it. */
export default { path: "/m/:manager/board" } satisfies ScreenRoute;
