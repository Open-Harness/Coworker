import type { Did } from "~/modules/api/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { generalHandlers } from "./do-general.ts";
import { managerHandlers } from "./do-managers.ts";
import { spendingHandlers } from "./do-spending.ts";

/** What each doing does. A doing that is in the registry and has no handler here is refused in words, not pretended. */
export type Handler = (c: ConsoleDeps, values: Readonly<Record<string, unknown>>) => Promise<Did>;

const handlers: Readonly<Record<string, Handler>> = { ...generalHandlers, ...managerHandlers, ...spendingHandlers };

export const handlerFor = (id: string): Handler | undefined => handlers[id];
