import type { ScreenRoute } from "~/modules/page/types.ts";

/** `/juno` is About; the other eight pages are `/juno/<page>`. */
export default [
  { path: "/juno", place: "Juno" },
  { path: "/juno/:page", place: "Juno" },
] satisfies readonly ScreenRoute[];
