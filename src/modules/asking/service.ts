import { asks } from "~/modules/asks/service.ts";
import { answerOnce } from "./internal/answer.ts";
import { heard } from "./internal/heard.ts";
import { gone, open } from "./internal/open.ts";
import { tick } from "./internal/tick.ts";
import { inboxOf } from "./internal/inbox.ts";
import { mayAnswer } from "./internal/who.ts";
import type { AskAnswer, AskOp, Asking, AskingDeps } from "./types.ts";

async function handle(c: AskingDeps, op: AskOp): Promise<AskAnswer> {
  switch (op.op) {
    case "open":
      return open(c, op.input);
    case "inbox":
      return { op: "inbox", items: inboxOf(c, op.person) };
    case "answer": {
      const kept = c.store.get(op.ask);
      if (kept === undefined) return { op: "answer", answered: { _tag: "NoSuchAsk" } };
      const may = mayAnswer(kept.ask, op.by);
      const reply = { by: op.by.name, answer: op.answer, where: "inbox", may, ...(op.always === undefined ? {} : { always: op.always }) };
      return { op: "answer", answered: await answerOnce(c, kept, reply) };
    }
    case "gone":
      gone(c, op.work, op.why, op.ask);
      return { op: "gone" };
    case "covered":
      return { op: "covered", is: c.store.rules().some((rule) => asks.covers(rule, op.use)) };
  }
}

/** Asking: what waits for a person, kept in the workspace's object, answered once from anywhere, reminded, and told to who asked. */
export function createAsking(c: AskingDeps): Asking {
  return { handle: (op) => handle(c, op), heard: (said) => heard(c, said), tick: () => tick(c) };
}
