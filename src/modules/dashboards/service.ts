import { home } from "./internal/home.ts";
import { missionLine } from "./internal/mission.ts";
import { overview } from "./internal/overview.ts";
import type { Dashboards } from "./types.ts";

export { DAYS } from "./types.ts";

/** Pure: facts in, numbers out. The HTTP layer gathers the facts; nothing here touches the world. */
export const dashboards: Dashboards = { home, overview, missionLine };
