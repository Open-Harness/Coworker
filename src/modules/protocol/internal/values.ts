import { int, str } from "@earendil-works/pi-schema";
import { LIMITS } from "./limits.ts";

export { modelRef, thinkingLevel } from "~/modules/agent-config/service.ts";

/* What commands and events have in common. */
export const requestId = str({ minLength: 1, maxLength: LIMITS.requestId });
export const uuid = str({ pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$" });
export const positive = int({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER });
export const natural = int({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER });
export const text = (maxLength: number) => str({ minLength: 1, maxLength, pattern: "\\S" });
export const title = text(LIMITS.title);
