import type { Answer, Did } from "~/modules/api/types.ts";
import type { MailAnswer } from "~/modules/mailing/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { ok, problem } from "./around.ts";

/* A manager's mailbox as a mail client shows it, and what a person does there: write as the co-worker, hand it back, tell the manager. */

const gone = (id: string) => problem(404, `There is no manager "${id}" here.`);
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null;

const hears = async (c: ConsoleDeps, id: string): Promise<boolean> => (await c.store.managers()).some(({ node }) => node.id === id);

export async function mailView(c: ConsoleDeps, id: string): Promise<Answer<unknown>> {
  if (!(await hears(c, id))) return gone(id);
  const answer = await c.store.mail({ is: "view" });
  return answer.is === "view" ? ok(answer.view) : problem(500, "The mailbox did not answer.");
}

export async function conversationView(c: ConsoleDeps, id: string, conversation: string): Promise<Answer<unknown>> {
  if (!(await hears(c, id))) return gone(id);
  const answer = await c.store.mail({ is: "conversation", id: conversation });
  if (answer.is !== "conversation") return problem(500, "The mailbox did not answer.");
  return answer.view === undefined ? problem(404, `There is no conversation "${conversation}" in this mailbox.`) : ok(answer.view);
}

const didOf = (answer: MailAnswer): Did =>
  answer.is === "done"
    ? { _tag: "Done", id: answer.id, says: answer.says, link: null }
    : { _tag: "Refused", why: answer.is === "refused" || answer.is === "failed" ? answer.why : "The mailbox did not answer." };

/** `{is: "write" | "hand back" | "tell", text, key}` on one conversation. */
export async function writeIn(
  c: ConsoleDeps,
  id: string,
  connector: string,
  conversation: string,
  body: unknown,
): Promise<Answer<unknown>> {
  if (!(await hears(c, id))) return gone(id);
  if (connector !== "email") return problem(404, `${connector} has no conversations to write in here.`);
  if (!isRecord(body) || typeof body["key"] !== "string") return problem(422, "Send {is, text, key}.");
  const [text, key, person] = [typeof body["text"] === "string" ? body["text"] : "", body["key"], c.who.name];
  switch (body["is"]) {
    case "write":
      return ok(didOf(await c.store.mail({ is: "write", id: conversation, text, key, person })));
    case "hand back":
      return ok(didOf(await c.store.mail({ is: "hand back", id: conversation, key, person })));
    case "tell":
      return ok(didOf(await c.store.mail({ is: "tell", id: conversation, text, key, person })));
    default:
      return problem(422, "Say whether to write, hand back or tell.");
  }
}
