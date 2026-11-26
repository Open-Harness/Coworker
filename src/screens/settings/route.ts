import type { ScreenRoute } from "~/modules/page/types.ts";

/** Every page of Settings is one address under `/settings`; Connect GitHub sits under Connectors. */
export default [
  { path: "/settings", place: "Settings" },
  { path: "/settings/:page", place: "Settings" },
  { path: "/settings/connectors/github", place: "Settings" },
] satisfies ScreenRoute[];
