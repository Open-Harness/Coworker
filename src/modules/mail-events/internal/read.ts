import type { Address, MailRecord, Read, Us } from "../types.ts";
import { ids, isOurs, mailboxes } from "./address.ts";
import { isReport, reportsOf } from "./bounce.ts";
import { madeId } from "./id.ts";
import { kindOf } from "./kind.ts";
import { parse, type Parsed } from "./parse.ts";
import { proofOf } from "./proof.ts";
import { htmlToText, whatIsNew } from "./words.ts";

interface Envelope {
  readonly from: string;
  readonly to: string;
  readonly at: number;
}

const NOBODY: Address = { address: "", name: "" };

/** A part that is the mail's content, not a message about a message. */
const content = ({ type }: Parsed["parts"][number]): boolean => !type.startsWith("message/");

function whenOf(parsed: Parsed, fallback: number): number {
  const date = Date.parse(parsed.email.date ?? "");
  return Number.isNaN(date) ? fallback : date;
}

function wordsOf(parsed: Parsed): string {
  const text = parsed.email.text ?? (parsed.email.html === undefined ? "" : htmlToText(parsed.email.html));
  return text.replaceAll("\r\n", "\n").replaceAll("\r", "\n").replaceAll("\u0000", "").trim();
}

function recordOf(parsed: Parsed, envelope: Envelope, us: Us): MailRecord {
  const { email } = parsed;
  const from = mailboxes(email.from === undefined ? undefined : [email.from])[0] ?? {
    ...NOBODY,
    address: envelope.from.trim().toLowerCase(),
  };
  const subject = (email.subject ?? "").replaceAll(/\s+/gu, " ").trim();
  const whole = wordsOf(parsed);
  const reply = ids(email.inReplyTo)[0] ?? null;
  const report = isReport(parsed, from.address, subject);
  const is = report ? "report" : kindOf(parsed, from.address, subject);
  const id =
    ids(email.messageId)[0] ??
    madeId([from.address, ...mailboxes(email.to).map(({ address }) => address), subject, email.date ?? "", whole]);
  return {
    id,
    is,
    from,
    replyTo: mailboxes(email.replyTo)[0] ?? null,
    to: mailboxes(email.to),
    cc: mailboxes(email.cc),
    subject,
    at: whenOf(parsed, envelope.at),
    inReplyTo: reply === null || reply === id ? null : reply,
    refs: [...new Set([...ids(email.references), ...(reply === null ? [] : [reply])])].filter((one) => one !== id),
    text: report ? whole : whatIsNew(whole),
    whole,
    proof: proofOf(parsed.headers, from.address, us),
    reports: report ? reportsOf(parsed, from.address, subject) : [],
    attachments: parsed.parts
      .filter(content)
      .map(({ type, name, bytes }) => ({ name: name === "" ? "attachment" : name, type, size: bytes.length })),
  };
}

/** One message as it arrived. Never throws: what cannot be read is `Broken`. */
export async function read(raw: string | Uint8Array, envelope: Envelope, us: Us): Promise<Read> {
  if ((typeof raw === "string" ? raw : new TextDecoder().decode(raw)).trim() === "") return { _tag: "Broken", why: "empty" };
  try {
    const parsed = await parse(raw);
    const mail = recordOf(parsed, envelope, us);
    if (isOurs(mail.from.address, us)) return { _tag: "Noise", why: "ours", mail };
    if (mail.is === "list") return { _tag: "Noise", why: "from a list", mail };
    if (mail.is === "machine") return { _tag: "Noise", why: "nobody typed it", mail };
    return { _tag: "Mail", mail, bytes: parsed.parts.filter(content).map(({ bytes: one }) => one) };
  } catch (error) {
    return { _tag: "Broken", why: error instanceof Error ? error.message : "unreadable" };
  }
}
