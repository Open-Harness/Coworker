import type { MailAnswer, MailCall, MailingDeps } from "../types.ts";
import { hear } from "./hear.ts";
import { draft, handBack, tell, write } from "./person.ts";
import { answerTo, compose } from "./send.ts";
import { conversationView, mailView, search } from "./view.ts";

/** One call of the mailbox, answered in its own kind of answer. */
export async function handle(c: MailingDeps, call: MailCall): Promise<MailAnswer> {
  switch (call.is) {
    case "hear":
      return hear(c, call);
    case "view":
      return { is: "view", view: await mailView(c) };
    case "conversation":
      return { is: "conversation", view: await conversationView(c, call.id) };
    case "write":
      return write(c, call);
    case "hand back":
      return handBack(c, call);
    case "tell":
      return tell(c, call);
    case "reply":
      return answerTo(c, call.id, call.text, `reply:${call.key}`, call.by, false);
    case "send":
      return compose(c, call.to, call.subject, call.text, `send:${call.key}`, call.by, call.inside);
    case "draft":
      return draft(c, call);
    case "search":
      return { is: "found", lines: search(c, call.words) };
  }
}
