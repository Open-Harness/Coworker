import { COWORKER, type ChatDid } from "~/modules/talks/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { whoOf } from "./around.ts";
import { saveChat } from "./chat-rows.ts";
import { run } from "./do.ts";
import { identityOf } from "./shell.ts";

/* What the co-worker waited to do, and a person has now said yes or no to: done once, by the same door, for the one who asked. */

interface Waited {
  readonly ask: string;
  readonly doing: string;
  readonly values: Readonly<Record<string, unknown>>;
  readonly chat: string;
  readonly by: string;
  readonly done: boolean;
}

const KEPT = "act";

/** The line of the chat that waited says how it ended. */
async function settleLine(c: ConsoleDeps, waited: Waited, entry: Pick<ChatDid, "state" | "says" | "link">): Promise<void> {
  const row = (await c.store.chats(waited.by)).find(({ id }) => id === waited.chat);
  if (row === undefined) return;
  const lines = row.lines.map((line) =>
    (line.did ?? []).some(({ ask }) => ask === waited.ask)
      ? { ...line, did: (line.did ?? []).map((one) => (one.ask === waited.ask ? { ...one, ...entry } : one)) }
      : line,
  );
  await saveChat(c, { ...row, lines });
}

/** `answer` is what was said to the ask `ask`; `c` is the person who said it. Only a yes does what waited, and only the first time. */
export async function carryOn(c: ConsoleDeps, ask: string, answer: string): Promise<void> {
  const waited = ((await c.store.kept(KEPT)) as readonly Waited[]).find((one) => one.ask === ask);
  if (waited === undefined || waited.done) return;
  await c.store.keep(KEPT, ask, { ...waited, done: true });
  const asker = c.people.find(({ id }) => id === waited.by) ?? c.who;
  const name = (await identityOf(c)).name;
  if (answer !== "yes") {
    await settleLine(c, waited, { state: "refused", says: `${c.who.name} said no`, link: null });
    return;
  }
  const self = { id: COWORKER, name, is: "coworker", role: "Owner", own: {} } as const;
  const answered = await run(
    { ...c, who: asker, via: waited.chat },
    { doing: waited.doing, values: waited.values, key: `${ask}:yes` },
    self,
    { for: whoOf(asker), approvedBy: c.who.name },
  );
  const did = answered._tag === "Ok" ? answered.value : undefined;
  await settleLine(
    c,
    waited,
    did?._tag === "Done"
      ? { state: "done", says: did.says, link: did.link }
      : { state: "refused", says: did?._tag === "Refused" ? did.why : "It could not be done", link: null },
  );
}
