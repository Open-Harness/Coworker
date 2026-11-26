import type { MailEvents, Mails, Us } from "../types.ts";
import { isOurs } from "./address.ts";
import { oneConversation } from "./conversation.ts";

type Answered = ReturnType<MailEvents["answer"]>;

const no = (why: string): Answered => ({ _tag: "No", why });

function unique(addresses: readonly string[]): readonly string[] {
  return [...new Set(addresses.map((one) => one.trim().toLowerCase()).filter((one) => one !== ""))];
}

/**
 * The headers of an answer to one mail. To whom it came from (Reply-To over From), or to whom ours went; never to us, a list, a
 * machine, an away notice, or an address that is closed. Re: once; every reference.
 */
export function answer(mails: Mails, to: string, us: Us): Answered {
  const mail = mails[to];
  if (mail === undefined) return no("no such mail");
  if (mail.is !== "person" && mail.is !== "invite" && !isOurs(mail.from.address, us)) return no(`a ${mail.is} is not answered`);
  const ours = isOurs(mail.from.address, us);
  const closed = oneConversation(mails, to, us)?.closedTo ?? [];
  const main = ours ? mail.to.map(({ address }) => address) : [mail.replyTo?.address ?? mail.from.address];
  if (main.some((one) => isOurs(one, us))) return no("it would go to us");
  const first = unique(main).filter((one) => !closed.includes(one));
  if (first.length === 0) return no(unique(main).length === 0 ? "nobody to answer" : "closed: it cannot be written to");
  const cc = unique([...(ours ? [] : mail.to.map(({ address }) => address)), ...mail.cc.map(({ address }) => address)]).filter(
    (one) => !isOurs(one, us) && !first.includes(one) && !closed.includes(one),
  );
  const subject = /^\s*re:/iu.test(mail.subject) ? mail.subject : `Re: ${mail.subject}`;
  return { _tag: "Answer", to: first, cc, subject, inReplyTo: mail.id, refs: [...new Set([...mail.refs, mail.id])], autoSubmitted: null };
}
