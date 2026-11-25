import type { FileRef, Trigger } from "~/modules/triggers/types.ts";
import type { EmailDependencies, IncomingMail, Mailbox, Received } from "../types.ts";
import { domainOf, parseAddress } from "./address.ts";
import { type ParsedMail, parseMail } from "./parse.ts";

const NO_SUCH_ADDRESS = "There is no such address here";

const megabytes = (bytes: number): string => `${Math.round(bytes / 1_048_576)} MB`;

/** One thread per message id it names: a reply matches whichever one a Task follows. */
function threadsOf(mail: ParsedMail, id: string): Trigger["threads"] {
  const root = mail.references[0] ?? id;
  return [...new Set([root, ...mail.references, id])].map((key) => ({ kind: "email", key }));
}

async function store(dependencies: EmailDependencies, prefix: string, mail: ParsedMail): Promise<FileRef[]> {
  return Promise.all(
    mail.attachments.map(async ({ name, type, bytes }, index) => {
      const key = `${prefix}/${index}-${name.replace(/[^\w.-]+/gu, "_")}`;
      await dependencies.files.put(key, bytes, type);
      return { key, name, type, size: bytes.byteLength };
    }),
  );
}

async function drop(mailbox: Mailbox, managerId: string, mail: ParsedMail, reason: string): Promise<Received> {
  await mailbox.logEvent(managerId, `email from ${mail.from || "nobody"}: “${mail.subject}” → dropped: ${reason}`);
  return { _tag: "Dropped", reason };
}

/** What the app itself sends from: an address managers have, or its own. Other people on the mail domain are people. */
const isOurs = ({ mailDomain, sendFrom }: EmailDependencies, from: string): boolean =>
  parseAddress(from, mailDomain) !== undefined || from === sendFrom.toLowerCase();

/** Email Routing → a Trigger, or a reason it is not one. */
export async function receiveMail(dependencies: EmailDependencies, incoming: IncomingMail): Promise<Received> {
  if (incoming.rawSize > dependencies.maxBytes) {
    return { _tag: "Rejected", reason: `The message is over ${megabytes(dependencies.maxBytes)}. Send a link to large files instead.` };
  }
  const address = parseAddress(incoming.to, dependencies.mailDomain);
  const mailbox = address === undefined ? undefined : await dependencies.mailbox(address.workspace);
  const manager = (await mailbox?.managers())?.find(({ slug }) => slug === address?.slug);
  if (address === undefined || mailbox === undefined || manager === undefined) return { _tag: "Rejected", reason: NO_SUCH_ADDRESS };
  const mail = await parseMail(incoming.raw, dependencies.authServId);
  const domain = domainOf(mail.from);
  if (isOurs(dependencies, mail.from)) return drop(mailbox, manager.managerId, mail, "our own mail came back");
  if (mail.automatic) return drop(mailbox, manager.managerId, mail, "an automatic reply or a bounce");
  const id = mail.messageId ?? `<${incoming.rawSize}.${mail.from}.${mail.subject}>`;
  const trigger: Trigger = {
    id: `email:${id}`,
    source: "email",
    managerId: manager.managerId,
    scope: "mailbox",
    threads: threadsOf(mail, id),
    actor: { kind: "email", id: mail.from, human: true, display: mail.fromName || mail.from, verified: mail.dkimPassed.includes(domain) },
    addressed: "direct",
    at: dependencies.now(),
    title: mail.subject,
    text: mail.text,
    attachments: await store(dependencies, `email/${manager.managerId}/${encodeURIComponent(id)}`, mail),
    replyTo: { kind: "email", to: mail.replyTo ?? mail.from, subject: mail.subject, messageId: id, references: mail.references },
    ...(address.task === undefined ? {} : { task: address.task }),
  };
  return { _tag: "Routed", routed: await mailbox.receive(trigger) };
}
