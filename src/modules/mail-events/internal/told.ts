import type { MailRecord, Mails, Told, Us } from "../types.ts";
import { isOurs } from "./address.ts";
import { allConversations } from "./conversation.ts";
import { byTime } from "./groups.ts";

type Fact = Told;

/** What is true of the mail, by what it is: one for each mail that was written, one for each mail of ours that came back or was complained about. */
function factsOf(mails: Mails, us: Us, conversationOf: (id: string) => string): ReadonlyMap<string, Fact> {
  const facts = new Map<string, Fact>();
  const add = (fact: Fact) => {
    if (!facts.has(fact.key)) facts.set(fact.key, fact);
  };
  for (const mail of Object.values(mails).toSorted(byTime)) {
    const own = isOurs(mail.from.address, us);
    if (!own && (mail.is === "person" || mail.is === "invite"))
      add({ key: `wrote:${mail.id}`, conversation: conversationOf(mail.id), at: mail.at, is: "wrote", mail: mail.id });
    if (!own && mail.is === "away")
      add({
        key: `away:${mail.id}`,
        conversation: conversationOf(mail.id),
        at: mail.at,
        is: "away",
        who: mail.from.address,
        says: mail.text,
      });
    if (mail.is === "report") for (const fact of reported(mails, mail, us, conversationOf)) add(fact);
  }
  return facts;
}

function reported(mails: Mails, mail: MailRecord, us: Us, conversationOf: (id: string) => string): readonly Fact[] {
  return mail.reports.flatMap((report): Fact[] => {
    const of = report.of === null ? undefined : mails[report.of];
    if (report.of === null || of === undefined || !isOurs(of.from.address, us)) return [];
    const base = { conversation: conversationOf(report.of), at: mail.at, mail: report.of, to: report.to };
    if (report.is === "complained") return [{ ...base, key: `complained:${report.of}:${report.to ?? ""}`, is: "complained" }];
    if (report.is === "failed")
      return [
        {
          ...base,
          key: `came back:${report.of}:${report.to ?? ""}`,
          is: "came back",
          forGood: report.why === "no such address",
          says: report.says,
        },
      ];
    return [];
  });
}

/** What became true: what is in `after` and was not in `before`. Whatever the order mail came in, each is told once. */
export function told(before: Mails, after: Mails, us: Us): readonly Told[] {
  if (before === after) return [];
  const was = factsOf(before, us, () => "");
  const conversation = new Map(allConversations(after, us).flatMap(({ id, mails }) => mails.map((one) => [one, id] as const)));
  return [...factsOf(after, us, (id) => conversation.get(id) ?? id).values()]
    .filter(({ key }) => !was.has(key))
    .toSorted((a, b) => a.at - b.at || (a.key < b.key ? -1 : 1));
}
