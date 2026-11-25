/** Sending email. Inbound mail is the email source's business, not this module's. */
export interface OutgoingMail {
  /** A bare address, such as `launch.acme@co-worker.tech`. */
  readonly from: string;
  readonly fromName?: string;
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html?: string;
  readonly replyTo?: string;
  /** Threading and routing headers: `In-Reply-To`, `References`, `Message-ID`. */
  readonly headers?: Readonly<Record<string, string>>;
}

export type SendResult = { readonly _tag: "Sent"; readonly messageId: string } | { readonly _tag: "Failed"; readonly reason: string };

export interface Mailer {
  readonly send: (mail: OutgoingMail) => Promise<SendResult>;
}
