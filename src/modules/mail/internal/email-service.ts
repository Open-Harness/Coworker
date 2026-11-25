import type { Mailer, OutgoingMail, SendResult } from "../types.ts";

/** Sends through Cloudflare Email Service's `send_email` binding. A refusal becomes a value, never a throw. */
export function emailServiceMailer(binding: SendEmail): Mailer {
  return {
    send: async (mail: OutgoingMail): Promise<SendResult> => {
      try {
        const { messageId } = await binding.send({
          from: mail.fromName === undefined ? mail.from : { email: mail.from, name: mail.fromName },
          to: mail.to,
          subject: mail.subject,
          text: mail.text,
          ...(mail.html === undefined ? {} : { html: mail.html }),
          ...(mail.replyTo === undefined ? {} : { replyTo: mail.replyTo }),
          ...(mail.headers === undefined ? {} : { headers: { ...mail.headers } }),
        });
        return { _tag: "Sent", messageId };
      } catch (error) {
        return { _tag: "Failed", reason: error instanceof Error ? error.message : String(error) };
      }
    },
  };
}
