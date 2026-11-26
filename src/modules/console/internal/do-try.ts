import type { Did } from "~/modules/api/types.ts";
import { doings } from "~/modules/doings/service.ts";
import type { Change } from "~/modules/playbook/types.ts";
import { trials } from "~/modules/trials/service.ts";
import { askAPerson } from "./inbox.ts";
import type { Handler } from "./handlers.ts";
import { openManager } from "./managers.ts";
import type { Proposal } from "./proposals.ts";
import { tryChange } from "./trying.ts";

/* `try.change`: one change to one part, tried on the same cases beside what is there, and shown. It is made only when it is better by more than it varies by itself. */

const refuse = (why: string): Did => ({ _tag: "Refused", why });
const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** The change, as the co-worker says it: `{ line, was, becomes }` written as JSON. */
function changeOf(part: string): Change | string {
  let said: unknown;
  try {
    said = JSON.parse(part);
  } catch {
    return "The change is {line, was, becomes}, written as JSON.";
  }
  const one = typeof said === "object" && said !== null ? (said as Record<string, unknown>) : {};
  const [line, was, becomes] = [one["line"], one["was"], one["becomes"]];
  if (typeof line !== "string" || line === "") return "The change says which line it is of.";
  if ((was !== null && typeof was !== "string") || (becomes !== null && typeof becomes !== "string"))
    return "`was` and `becomes` are text, or null.";
  return { line, was: was ?? null, becomes: becomes ?? null };
}

const tryIt: Handler = async (c, values) => {
  const open = await openManager(c, text(values["manager"]));
  if (open === undefined) return refuse(`There is no manager "${text(values["manager"])}".`);
  const change = changeOf(text(values["part"]));
  if (typeof change === "string") return refuse(change);
  const tried = await tryChange(c, open, change);
  if (tried._tag === "Refused") return refuse(tried.why);
  const verdict = trials.verdict(tried.trial);
  const alone = verdict.keep && trials.mayAlone((await open.store.version())?.files ?? open.version.files, tried.trial.changes);
  const id = c.ids.next("trial");
  const at = c.clock.now();
  const sentence = doings.sentence("try.change", { manager: open.row.node.name }, c.who.name);
  const to = open.playbook?.objective.owner ?? open.row.node.answers;
  let made: Proposal = {
    id,
    of: tried.trial.of,
    title: `A change to ${tried.trial.of}`,
    says: verdict.why,
    change: tried.trial.changes[0] ?? change,
    trial: { ...tried.trial, id, says: verdict.why },
    verdict,
    at,
    to,
    ask: null,
    state: "open",
  };
  if (alone) {
    const saved = await open.store.save({
      files: tried.files,
      by: c.who.id,
      at,
      says: `Better on the same cases: ${verdict.why}`,
      from: "edited",
    });
    made = { ...made, state: "taken", says: `${verdict.why} Made as version ${saved.number}.` };
  } else {
    const ask = await askAPerson(c, {
      id: c.ids.next("ask"),
      to,
      need: "review",
      about: { manager: open.row.node.id, title: made.title },
      question: `Take the change to ${made.of} on ${open.row.node.name}?`,
      why: verdict.why,
      options: [
        { id: "take", label: "Take it", then: "It becomes the next version of the playbook." },
        { id: "leave", label: "Leave it", then: "The playbook stays as it is." },
      ],
      best: verdict.keep ? "take" : "leave",
      shows: null,
      then: [],
      else: "wait",
      inDays: 7,
    });
    made = { ...made, ask: typeof ask === "string" ? null : ask.id };
  }
  await open.store.keep("proposal", id, made);
  return { _tag: "Done", id, says: sentence, link: `/m/${open.row.node.id}/compare/${id}` };
};

export const tryHandlers: Readonly<Record<string, Handler>> = { "try.change": tryIt };
