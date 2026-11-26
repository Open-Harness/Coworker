import { answer } from "./internal/http.ts";
import { arrive } from "./internal/arrive.ts";
import type { Mailbox, MailboxDependencies, Post } from "./types.ts";

export { openBox } from "./internal/box.ts";
export { addressesOn } from "./types.ts";

export const createMailbox = (deps: MailboxDependencies): Mailbox => ({
  fetch: (request) => answer(deps, request),
  email: (incoming) => arrive(deps, incoming),
});

/** Sends through Cloudflare Email Service's `send_email` binding. A refusal becomes a value, never a throw. */
export const emailServicePost =
  (binding: SendEmail): Post =>
  async ({ from, to, bcc, subject, text, headers }) => {
    try {
      await binding.send({ from, to, bcc, subject, text, headers: { ...headers } });
      return { _tag: "Posted" };
    } catch (error) {
      return { _tag: "Refused", reason: error instanceof Error ? error.message : String(error) };
    }
  };
