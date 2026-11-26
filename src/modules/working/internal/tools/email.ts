import { connectors } from "~/modules/connectors/service.ts";
import type { MailAnswer } from "~/modules/mailing/types.ts";
import { textOf } from "../github.ts";
import { type Call, said, type Result, type Tool, wrong } from "../tool.ts";

/* What an agent does in the mailbox. Which conversation, and from where, are filled in by us from the work: a model never gives them. */

const conversationOf = ({ work }: Call): string => work.from.id;

/** What the mailbox answered, as a tool says it: a refusal is told in words; a mail that did not leave waits and is tried again. */
function told(answer: MailAnswer): Result {
  if (answer.is === "done") return said(answer.says);
  if (answer.is === "failed") return { _tag: "Waits", why: `The mail was not sent: ${answer.why}` };
  if (answer.is === "found")
    return said(answer.lines.length === 0 ? "Nothing in the mailbox says that." : answer.lines.join("\n").slice(0, 12_000));
  return wrong(answer.is === "refused" ? answer.why : "The mailbox did not answer.");
}

/** What is given is checked first: a fixed part, a missing one and an unknown one are refused in words. */
const checked = (action: string, args: unknown) => connectors.checked(action, args);

const RUN: Readonly<Record<string, (call: Call, args: unknown) => Promise<Result>>> = {
  "email.search": async (call, args) => {
    const read = checked("email.search", args);
    return read._tag === "Wrong" ? wrong(read.says) : told(await call.c.outside.mail({ is: "search", words: textOf(read.args["words"]) }));
  },
  "email.draft": async (call, args) => {
    const read = checked("email.draft", args);
    if (read._tag === "Wrong") return wrong(read.says);
    const by = call.c.manager.name;
    return told(await call.c.outside.mail({ is: "draft", id: conversationOf(call), text: textOf(read.args["text"]), key: call.id, by }));
  },
  "email.reply": async (call, args) => {
    const read = checked("email.reply", args);
    if (read._tag === "Wrong") return wrong(read.says);
    const by = call.c.manager.name;
    return told(await call.c.outside.mail({ is: "reply", id: conversationOf(call), text: textOf(read.args["text"]), key: call.id, by }));
  },
  "email.send_inside": (call, args) => sendTo(call, "email.send_inside", args, true),
  "email.send_outside": (call, args) => sendTo(call, "email.send_outside", args, false),
};

async function sendTo(call: Call, action: string, args: unknown, inside: boolean): Promise<Result> {
  const read = checked(action, args);
  if (read._tag === "Wrong") return wrong(read.says);
  const { to, subject, text } = { to: textOf(read.args["to"]), subject: textOf(read.args["subject"]), text: textOf(read.args["text"]) };
  return told(await call.c.outside.mail({ is: "send", to, subject, text, key: call.id, by: call.c.manager.name, inside }));
}

const KINDS = { text: { type: "string" }, number: { type: "number" }, list: { type: "array", items: { type: "string" } } } as const;

/** Every action of email as a tool, named as the connector names it. */
export const EMAIL_TOOLS: readonly Tool[] =
  connectors.all
    .find((one) => one.id === "email")
    ?.actions.map((action) => ({
      name: connectors.toolName(action.id),
      description: action.does,
      parameters: {
        type: "object",
        properties: Object.fromEntries(action.args.map((one) => [one.name, { ...KINDS[one.is], description: one.says }])),
        required: action.args.filter((one) => one.needed).map((one) => one.name),
        additionalProperties: false,
      },
      run: (call, args) => (RUN[action.id] ?? (async () => wrong(`${action.id} is not available yet.`)))(call, args),
    })) ?? [];
