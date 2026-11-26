import type { ScreenRoute } from "~/modules/page/types.ts";

/** Setting one up: what you want, then the walk the set-up skill wrote for it, step by step. */
export default [{ path: "/set-up" }, { path: "/set-up/:walk" }] satisfies ScreenRoute[];
