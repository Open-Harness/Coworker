import type { Mailer, OutgoingMail, SendResult } from "./types.ts";

/** A mailer that keeps what it was asked to send. */
export interface FakeMailer extends Mailer {
  readonly sent: readonly OutgoingMail[];
  /** The last message to an address, if any. */
  readonly lastTo: (address: string) => OutgoingMail | undefined;
  /** Makes every send fail until called with `undefined`. */
  readonly failWith: (reason: string | undefined) => void;
}

export function fakeMailer(): FakeMailer {
  const sent: OutgoingMail[] = [];
  let failure: string | undefined;
  return {
    sent,
    send: async (mail): Promise<SendResult> => {
      if (failure !== undefined) return { _tag: "Failed", reason: failure };
      sent.push(mail);
      return { _tag: "Sent", messageId: `<fake-${sent.length}@co-worker.test>` };
    },
    lastTo: (address) => sent.findLast((mail) => mail.to.toLowerCase() === address.toLowerCase()),
    failWith: (reason) => void (failure = reason),
  };
}

/** The one outbox the fake world's Worker sends through, so a test can read what it sent. */
export const outbox: FakeMailer = fakeMailer();
