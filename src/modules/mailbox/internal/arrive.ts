import PostalMime from "postal-mime";
import { COPY_HEADER, type Arrived, type Incoming, type MailboxDependencies } from "../types.ts";

/** A Durable Object's row holds 2 MB at most. */
const TEXT = 200_000;

const idIn = (value: string | undefined): string | null => /<[^<>\s]+>/u.exec(value ?? "")?.[0] ?? null;

async function parse(raw: ReadableStream<Uint8Array>): Promise<Arrived> {
  const mail = await PostalMime.parse(new Uint8Array(await new Response(raw).arrayBuffer()));
  return {
    messageId: idIn(mail.messageId),
    inReplyTo: idIn(mail.inReplyTo),
    from: (mail.from?.address ?? "").toLowerCase(),
    subject: mail.subject?.trim() ?? "",
    text: (mail.text ?? "").trim().slice(0, TEXT),
    copyOf: mail.headers.find(({ key }) => key === COPY_HEADER.toLowerCase())?.value.trim() ?? null,
  };
}

/** Email Routing → the box of the address it is for, or a refusal. */
export async function arrive({ addresses, box }: MailboxDependencies, incoming: Incoming): Promise<void> {
  const to = incoming.to.toLowerCase();
  if (!addresses.includes(to)) return incoming.setReject("There is no such address here");
  await box(to).keep(await parse(incoming.raw));
}
