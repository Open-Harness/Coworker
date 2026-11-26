import type { Item } from "~/modules/intake/types.ts";
import type { Read } from "~/modules/github-events/types.ts";

type Heard = Extract<Read, { readonly _tag: "Heard" }>;

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
    text: heard.text,
    same: heard.same,
  };
}
