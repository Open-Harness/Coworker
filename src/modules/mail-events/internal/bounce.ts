import type { Report } from "../types.ts";
import { addressIn, fieldsOf, fromStatus, statusIn } from "./dsn.ts";
import { header, type Parsed } from "./parse.ts";
import { whyNot } from "./why.ts";

const SUBJECT =
  /undeliver|delivery (?:status|failure|has failed|problem|incomplete)|failure notice|returned mail|mail delivery (?:failed|system)|delayed mail|delivery (?:delay|warning)|not delivered|could not be delivered|bounce/iu;
const DAEMON = /^(?:mailer-daemon|postmaster|mail delivery)/iu;
const COPY =
  /^(?:[ -]*(?:-{3,}[^\n]*(?:below this line|copy of the message|original message|forwarded)|original message headers)|(?:Return-Path|Received|DKIM-Signature|Message-I[dD]|Delivered-To|X-[\w-]+)\s*:)/imu;

/** A report is what a mail server sent about a mail: by its type, or by who it is from and what it says. */
export function isReport(parsed: Parsed, from: string, subject: string): boolean {
  if (/multipart\/report|report-type=/iu.test(header(parsed, "content-type") ?? "")) return true;
  if (parsed.parts.some(({ type }) => type === "message/delivery-status" || type === "message/feedback-report")) return true;
  return (
    (DAEMON.test(from) && (SUBJECT.test(subject) || header(parsed, "x-failed-recipients") !== undefined)) ||
    (header(parsed, "x-failed-recipients") !== undefined && SUBJECT.test(subject))
  );
}

/** Which of ours it is about: the Message-ID of the mail it sends back, from where it sits in the message. */
export function ofOf(parsed: Parsed): string | null {
  const after = (text: string, start: number): string | null =>
    /^Message-I[dD]:\s*(<[^<>\s]+>)/imu.exec(text.slice(Math.max(0, start)))?.[1] ?? null;
  const marker = parsed.raw.search(/^content-type:\s*(?:message\/(?:global|rfc822)|text\/rfc822-headers)/imu);
  const inMime = marker < 0 ? null : after(parsed.raw, marker);
  if (inMime !== null) return inMime;
  for (const part of parsed.parts) if (/rfc822/u.test(part.type)) return after(part.text, 0) ?? null;
  const copy = parsed.email.text === undefined ? -1 : (COPY.exec(parsed.email.text)?.index ?? -1);
  return copy < 0 ? null : after(parsed.email.text ?? "", copy);
}

/** The first address a message sent back names as its only recipient, in the copy it carries. */
function copiedTo(parsed: Parsed): string | null {
  const inside = parsed.parts.find(({ type }) => /rfc822/u.test(type))?.text ?? "";
  const found = [...(fieldsOf(inside)["to"] ?? "").matchAll(/[^\s<>,;"]+@[^\s<>,;"]+/gu)].map(([one = ""]) => one.toLowerCase());
  return found.length === 1 ? (found[0] ?? null) : null;
}

function complaint(parsed: Parsed, of: string | null): readonly Report[] {
  const fields = fieldsOf(parsed.parts.find(({ type }) => type === "message/feedback-report")?.text ?? "");
  const kind = fields["feedback-type"] ?? "abuse";
  const to = addressIn(fields["original-rcpt-to"]) ?? copiedTo(parsed);
  return [{ is: "complained", of, to, status: null, why: null, says: `Complaint: ${kind}` }];
}

/** Where a line starts a recipient of its own: an address, and what became of it after. */
const STARTS = /^\s*<?([^\s<>@]+@[^\s<>:]+?)>?:?(?:\s|$)/u;

/** When the words tell of several recipients, what they say of the first: from its line to the line of the next. */
function segment(text: string, to: string | null): string {
  const all = text.split("\n");
  const starts = all.flatMap((line, at) => {
    const address = STARTS.exec(line)?.[1]?.toLowerCase();
    return address === undefined ? [] : [{ at, address }];
  });
  const mine = starts.findIndex(({ address }) => address === to);
  const other = starts.slice(Math.max(mine, 0) + 1).find(({ address }) => address !== to);
  if (mine < 0 || new Set(starts.map(({ address }) => address)).size < 2 || other === undefined) return text;
  return all.slice(starts[mine]?.at, other.at).join("\n");
}

/** A message that says nothing for machines: its words say who and why, once. */
function fromWords(parsed: Parsed, from: string, subject: string, of: string | null): readonly Report[] {
  const body = (parsed.email.text ?? "").replaceAll("\r", "");
  const copy = COPY.exec(body)?.index ?? body.length;
  const text = body.slice(0, copy);
  const named = (header(parsed, "x-failed-recipients") ?? "").match(/[^\s<>,;]+@[^\s<>,;]+/gu) ?? [];
  const found = [...text.matchAll(/[^\s<>,;:()"']+@[^\s<>,;:()"']+/gu)].map(([one = ""]) => one.toLowerCase().replace(/[.:]+$/u, ""));
  const to = named[0]?.toLowerCase() ?? found.find((one) => one !== from && !DAEMON.test(one) && !/^(?:no-?reply)@/u.test(one)) ?? null;
  const mine = segment(text, to);
  const late = /\bdelay|still being retried|warning only|retried until|will keep trying/iu.test(`${subject}\n${text}`);
  const says = mine.replaceAll(/\s+/gu, " ").trim().slice(0, 400);
  const status = statusIn(mine);
  return [{ is: late ? "late" : "failed", of, to, status, why: whyNot(status, mine), says }];
}

/** What the mail server says became of ours: one report for each recipient it names, or one for the message. */
export function reportsOf(parsed: Parsed, from: string, subject: string): readonly Report[] {
  const of = ofOf(parsed);
  if (parsed.parts.some(({ type }) => type === "message/feedback-report")) return complaint(parsed, of);
  const human = (parsed.email.text ?? "").replaceAll(/\s+/gu, " ").trim();
  const status = parsed.parts.filter(({ type }) => type === "message/delivery-status").flatMap(({ text }) => fromStatus(text, human, of));
  const inBody = status.length > 0 ? [] : fromStatus(parsed.email.text ?? "", human, of);
  const inRaw = status.length + inBody.length > 0 || !/^Final-Recipient:/imu.test(parsed.raw) ? [] : fromStatus(parsed.raw, human, of);
  const structured = [...status, ...inBody, ...inRaw];
  return structured.length > 0 ? structured : fromWords(parsed, from, subject, of);
}
