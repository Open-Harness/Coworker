import type { Did } from "~/modules/api/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { generalHandlers } from "./do-general.ts";
import { managerHandlers } from "./do-managers.ts";
import { playbookHandlers } from "./do-playbook.ts";
import { tryHandlers } from "./do-try.ts";

/** What each doing does. A doing that is in the registry and has no handler here is refused in words, not pretended. */
export type Handler = (c: ConsoleDeps, values: Readonly<Record<string, unknown>>) => Promise<Did>;

const handlers: Readonly<Record<string, Handler>> = { ...generalHandlers, ...managerHandlers, ...playbookHandlers, ...tryHandlers };

export const handlerFor = (id: string): Handler | undefined => handlers[id];
