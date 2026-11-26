import { handle } from "./internal/handle.ts";
import { run } from "./internal/run.ts";
import type { Mailing, MailingDeps } from "./types.ts";

export const createMailing = (c: MailingDeps): Mailing => ({ handle: (call) => handle(c, call), run: () => run(c) });
