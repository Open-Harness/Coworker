import { mailEvents } from "~/modules/mail-events/service.ts";
import type { Told } from "~/modules/mail-events/types.ts";
import type { MailingDeps } from "../types.ts";
import { durationMs, hasOf, isOurs, threadOf, usOf } from "./around.ts";

/** How long what nobody follows is kept, and how soon it is looked at again. */
const STALE = 60_000;
const SOON = 5_000;

const saysOf = (told: Told): string | undefined => {
  if (told.is === "came back") return `${told.to ?? "An address"} did not get it: ${told.says}`;
  if (told.is === "complained") return `${told.to ?? "The person"} complained about it.`;
  return told.is === "away" ? `${told.who} is away.` : undefined;
};

/** What became true of a conversation is told to each work that follows it, once. News nobody follows is let go of after a minute. */
async function tell(c: MailingDeps): Promise<boolean> {
  const listeners = await c.listeners();
  let owed = false;
  for (const { told, since } of c.store.news()) {
    const thread = threadOf(c.mailbox, told.conversation);
    const event = mailEvents.asWork(told, { account: "email", place: c.mailbox });
    let found = false;
    for (const listener of listeners)
      for (const work of await listener.open()) {
        if (event === undefined || !work.follows.includes(thread)) continue;
        found = true;
        const says = saysOf(told);
        await listener.news({ work: work.id, event, ...(says === undefined ? {} : { says }) });
      }
    if (found || event === undefined || c.clock.now() - since > STALE) c.store.told(told.key);
    else owed = true;
  }
  return owed;
}

/**
 * Quiet after our question: a conversation whose last word is ours, that a manager has (not a person), that open work follows, that nobody
 * is away from, and is silent as long as a wait trigger says, becomes one item, once. Answers when the next is due.
 */
async function quiet(c: MailingDeps): Promise<number | null> {
  const [listeners, mails, now] = [await c.listeners(), c.store.mails(), c.clock.now()];
  let next: number | null = null;
  for (const known of mailEvents.conversations(mails, usOf(c))) {
    if (known.waits !== "them" || hasOf(c, known.id) !== "manager") continue;
    const all = known.mails.flatMap((id) => (mails[id] === undefined ? [] : [mails[id]]));
    const last = all.findLast((mail) => isOurs(c, mail) || mail.is === "person" || mail.is === "invite");
    if (last === undefined || all.some((mail) => mail.is === "away" && mail.at >= last.at)) continue;
    const thread = threadOf(c.mailbox, known.id);
    for (const listener of listeners) {
      if (!(await listener.open()).some(({ follows }) => follows.includes(thread))) continue;
      for (const trigger of await listener.waits()) {
        const at = last.at + durationMs(trigger.for);
        if (at > now) {
          next = Math.min(next ?? at, at);
          continue;
        }
        const subject = all.find((mail) => !isOurs(c, mail))?.subject ?? last.subject;
        const actor = { address: "code:wait", name: trigger.name, bot: true };
        const item = {
          by: "wait",
          account: "email",
          place: c.mailbox,
          thread,
          event: "quiet",
          actor,
          addressed: false,
          at: now,
          title: subject,
          text: `Nobody answered for ${trigger.for}.`,
          same: `wait:${trigger.id}:${known.id}:${last.id}`,
        } as const;
        c.keep(item, trigger.id, [listener.manager], null);
      }
    }
  }
  return next;
}

export async function run(c: MailingDeps): Promise<{ readonly again: number | null }> {
  const owed = await tell(c).catch(() => true);
  const next = await quiet(c).catch(() => c.clock.now() + SOON);
  const soon = owed ? c.clock.now() + SOON : null;
  return { again: soon === null ? next : next === null ? soon : Math.min(soon, next) };
}
