/**
 * The entry of the `coworker-mailbox` Worker (`wrangler.mailbox.jsonc`): the mailboxes of the live tier's two outside people.
 * The composition root of this executable: it reads its settings, opens the boxes and hands requests and mail on.
 */
import { DurableObject } from "cloudflare:workers";
import { addressesOn, createMailbox, emailServicePost, openBox } from "../modules/mailbox/service.ts";
import type { Arrived, Box, Incoming, Mailbox } from "../modules/mailbox/types.ts";

interface Env {
  readonly MAILBOX_DOMAIN: string;
  /** A secret: `wrangler secret put MAILBOX_TOKEN --config wrangler.mailbox.jsonc`, which `pnpm staging --apply` does. */
  readonly MAILBOX_TOKEN?: string;
  readonly BOXES: DurableObjectNamespace<MailboxObject>;
  readonly EMAIL: SendEmail;
}

/** One address's mail. */
export class MailboxObject extends DurableObject<Env> {
  private readonly box: Box;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.box = openBox({ sql: ctx.storage.sql, clock: { now: () => Date.now() } });
  }
  keep(mail: Arrived) {
    return this.box.keep(mail);
  }
  list(subject: string) {
    return this.box.list(subject);
  }
  read(uid: number) {
    return this.box.read(uid);
  }
  sending(id: string) {
    return this.box.sending(id);
  }
  sent(id: string) {
    return this.box.sent(id);
  }
}

const mailboxOf = (env: Env): Mailbox =>
  createMailbox({
    token: env.MAILBOX_TOKEN,
    domain: env.MAILBOX_DOMAIN,
    addresses: addressesOn(env.MAILBOX_DOMAIN),
    box: (address) => env.BOXES.get(env.BOXES.idFromName(address)),
    post: emailServicePost(env.EMAIL),
    ids: { next: (prefix) => `${prefix}_${crypto.randomUUID()}` },
  });

export default {
  fetch: (request: Request, env: Env): Promise<Response> => mailboxOf(env).fetch(request),
  email: (message: Incoming, env: Env): Promise<void> =>
    mailboxOf(env).email({ to: message.to, raw: message.raw, setReject: (reason) => message.setReject(reason) }),
};
