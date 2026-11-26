import type { MailRecord, Us } from "~/modules/mail-events/types.ts";
import { mailEvents } from "~/modules/mail-events/service.ts";
import type { MailingDeps } from "../types.ts";

/** The conversation of a mailbox as work follows it: `email:<mailbox>#<conversation>`. */
export const threadOf = (mailbox: string, conversation: string): string => `email:${mailbox}#${conversation}`;

export const usOf = (c: Pick<MailingDeps, "addresses">, server = ""): Us => ({ addresses: c.addresses, server });

export const isOurs = (c: Pick<MailingDeps, "addresses">, mail: MailRecord): boolean =>
  c.addresses.some((one) => one.toLowerCase() === mail.from.address);

/** What a person wrote, or was asked of us: the kinds of mail that are somebody asking. */
export const isPerson = (mail: MailRecord): boolean => mail.is === "person" || mail.is === "invite";

const UNITS: Readonly<Record<string, number>> = { m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };

/** `3d`, `45m`, `4h`: how long. Anything else is a day. */
export function durationMs(text: string): number {
  const found = /^(\d+)\s*([mhdw])$/u.exec(text.trim());
  return found === null ? (UNITS["d"] ?? 0) : Number(found[1]) * (UNITS[found[2] ?? "d"] ?? 0);
}

/** Who has a conversation: nobody's note says a manager, a person's says their name. */
export const hasOf = (c: MailingDeps, conversation: string): "manager" | { readonly person: string } => {
  const note = c.store.note(`has:${conversation}`);
  return note === undefined || note === "" ? "manager" : { person: note };
};

export const conversationOf = (c: MailingDeps, id: string) => mailEvents.conversationOf(c.store.mails(), id, usOf(c));
