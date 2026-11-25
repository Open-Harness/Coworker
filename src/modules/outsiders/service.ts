import { eventually } from "./internal/eventually.ts";
import { linkAfter } from "./internal/link.ts";
import { githubPerson } from "./internal/github.ts";
import { mailboxPerson } from "./internal/mailbox.ts";
import type { Outsiders } from "./types.ts";

export { isFailure } from "./types.ts";

export const outsiders: Outsiders = { mailboxPerson, githubPerson, linkAfter, eventually };
