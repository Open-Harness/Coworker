import { isFailure, type MailPerson, type Polling } from "../types.ts";
import { eventually } from "./eventually.ts";

const LINK = /https?:\/\/\S+/u;

/** The newest sign-in mail that arrives after `ask`, and the link in it. */
export async function linkAfter(
  person: MailPerson,
  subject: string,
  ask: () => Promise<Response>,
  polling: Polling,
): Promise<string | undefined> {
  const before = await person.inbox(subject);
  const seen = isFailure(before) ? 0 : Math.max(0, ...before.map(({ uid }) => uid));
  if (!(await ask()).ok) return undefined;
  return eventually(async () => {
    const inbox = await person.inbox(subject);
    if (isFailure(inbox)) throw new Error(inbox.reason);
    const [fresh] = inbox.filter(({ uid }) => uid > seen).sort((a, b) => b.uid - a.uid);
    if (fresh === undefined) return undefined;
    const body = await person.read(fresh.uid);
    return isFailure(body) ? undefined : LINK.exec(body)?.[0];
  }, polling);
}
