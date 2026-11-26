import type { Conversation, MailRecord, Mails, Sent, Us } from "../types.ts";
import { isOurs } from "./address.ts";
import { groups, rootOf, type Group } from "./groups.ts";

const RANK: Readonly<Record<Sent, number>> = { sent: 0, late: 1, delivered: 2, failed: 3, complained: 3 };

/** What one report says became of ours. */
function sentOf(report: MailRecord["reports"][number]): Sent {
  return report.is === "failed" ? "failed" : report.is === "complained" ? "complained" : report.is;
}

/** Failed and complained stay; delivered is after late; a later report never takes back what was said. */
function stronger(a: Sent, b: Sent): Sent {
  return RANK[b] > RANK[a] || (RANK[b] === RANK[a] && b === "complained") ? b : a;
}

/** The reports in the group about each mail of ours that is in it. A report about a mail that is not ours is about nobody. */
function aboutOurs(group: Group, us: Us): readonly { readonly of: string; readonly report: MailRecord["reports"][number] }[] {
  const ours = new Set(group.mails.filter((mail) => isOurs(mail.from.address, us)).map(({ id }) => id));
  return group.mails
    .filter(({ is }) => is === "report")
    .flatMap(({ reports }) => reports.flatMap((report) => (report.of !== null && ours.has(report.of) ? [{ of: report.of, report }] : [])));
}

function peopleOf(group: Group, us: Us): readonly string[] {
  const seen = new Set<string>();
  for (const mail of group.mails) {
    if (!isOurs(mail.from.address, us) && mail.is !== "person" && mail.is !== "invite" && mail.is !== "away") continue;
    for (const { address } of [mail.from, ...mail.to, ...mail.cc]) if (address !== "" && !isOurs(address, us)) seen.add(address);
  }
  return [...seen];
}

/** Whose turn it is, by the last mail a person or we wrote. Nobody's, when what we wrote cannot be answered. */
function waitsOf(group: Group, us: Us, people: readonly string[], closed: readonly string[]): Conversation["waits"] {
  const last = group.mails.findLast((mail) => isOurs(mail.from.address, us) || mail.is === "person" || mail.is === "invite");
  if (last === undefined) return "nobody";
  if (!isOurs(last.from.address, us)) return "us";
  return people.length > 0 && people.every((one) => closed.includes(one)) ? "nobody" : "them";
}

export function conversationOfGroup(group: Group, us: Us): Conversation {
  const about = aboutOurs(group, us);
  const sent: Record<string, Sent> = {};
  for (const mail of group.mails) if (isOurs(mail.from.address, us)) sent[mail.id] = "sent";
  for (const { of, report } of about) sent[of] = stronger(sent[of] ?? "sent", sentOf(report));
  const closed = about.flatMap(({ report }) =>
    report.to !== null && (report.is === "complained" || (report.is === "failed" && report.why === "no such address")) ? [report.to] : [],
  );
  const closedTo = [...new Set(closed)].toSorted();
  const people = peopleOf(group, us);
  return { id: rootOf(group), mails: group.mails.map(({ id }) => id), people, waits: waitsOf(group, us, people, closedTo), sent, closedTo };
}

/** Reports on their own are not a conversation: they are about a mail that is not here, or not ours. */
function isConversation(group: Group): boolean {
  return group.mails.some(({ is }) => is !== "report");
}

export function allConversations(mails: Mails, us: Us): readonly Conversation[] {
  return groups(mails)
    .filter(isConversation)
    .map((group) => conversationOfGroup(group, us))
    .toSorted((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function oneConversation(mails: Mails, id: string, us: Us): Conversation | undefined {
  const group = groups(mails).find((one) => one.ids.has(id));
  return group === undefined || !isConversation(group) ? undefined : conversationOfGroup(group, us);
}
