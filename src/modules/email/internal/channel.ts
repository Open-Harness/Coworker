import type { Mailer } from "~/modules/mail/types.ts";
import type { Channel } from "~/modules/triggers/types.ts";
import { taskAddress } from "./address.ts";

const reSubject = (subject: string): string => (/^re:/iu.test(subject) ? subject : `Re: ${subject}`);

/** A reply in the sender's thread: same subject, `In-Reply-To` the message, `References` the whole thread. */
export const emailChannel = (mailer: Mailer): Channel => ({
  send: async (outbound) => {
    const { to } = outbound;
    if (to.kind !== "email") return { _tag: "Gone", reason: "Not an email thread" };
    const sent = await mailer.send({
      from: outbound.from.address,
      fromName: outbound.from.name,
      to: to.to,
      subject: reSubject(to.subject),
      text: outbound.text,
      replyTo: taskAddress(outbound.from.address, outbound.task),
      headers: { "In-Reply-To": to.messageId, References: [...to.references, to.messageId].join(" ") },
    });
    return sent._tag === "Sent" ? { _tag: "Sent" } : { _tag: "Failed", reason: sent.reason };
  },
});
