import type { Item } from "~/modules/intake/types.ts";
import type { Read } from "~/modules/github-events/types.ts";

type Heard = Extract<Read, { readonly _tag: "Heard" }>;

/** A comment on a line is answered on that line, so what it says carries which comment it is and where. */
function textOf(heard: Heard): string {
  const line = heard.event === "line_comment" ? heard.records.find((one) => one.is === "line") : undefined;
  if (line === undefined) return heard.text;
  const where = line.line === null ? line.path : `${line.path} line ${line.line}`;
  return `${heard.text}\n(comment id ${line.id}, on ${where})`;
}

/** One thing that came in: from where, from whom, in which conversation, and whether it spoke to us. */
export function itemOf(heard: Heard): Omit<Item, "id" | "trigger"> {
  const number = heard.numbers[0];
  return {
    by: "event",
    account: "github",
    place: heard.repo,
    thread: number === undefined ? `github:${heard.repo}` : `github:${heard.repo}#${number}`,
    event: heard.event,
    actor: { address: `github:${heard.who.id}`, name: heard.who.login, bot: heard.who.bot },
    addressed: heard.addressed,
    at: heard.at,
    title: heard.title,
    text: textOf(heard),
    same: heard.same,
  };
}
