import type { Clock } from "~/modules/page/types.ts";
import type { InboxItem, Person } from "~/modules/views-workspace/types.ts";
import type { Item, Standing } from "./data.ts";

const STANDING: Readonly<Record<InboxItem["standing"], Standing>> = { asks: "ask", waits: "wait", know: "know", done: "done" };

/** What the page draws of one thing the console gave it: the words of the ask, and where its options lead. */
export function itemOf(view: InboxItem, people: readonly Person[], clock: Clock): Item {
  const { ask } = view;
  const standing = STANDING[view.standing];
  const answered = ask.state._tag === "Answered" ? ask.state.answer : undefined;
  const waits = people.find((person) => person.id === ask.to)?.name.split(" ")[0];
  return {
    id: ask.id,
    from: view.from,
    title: ask.about.title,
    preview: view.preview,
    at: clock.short(ask.at),
    standing,
    isNew: view.isNew,
    asks: ask.question,
    why: ask.why,
    looked: [...view.looked],
    options: ask.options.map((option) => {
      const beside = view.beside[option.id];
      return {
        id: option.id,
        label: option.label,
        told: option.then,
        ...(beside?.is === "open" ? { go: beside.link } : {}),
        ...(beside?.is === "remind" ? { keeps: true } : {}),
      };
    }),
    otherwise: view.otherwise ?? "",
    links: view.links.map((link) => ({ label: link.label, to: link.link })),
    ...(view.proposes ? { isProposal: true } : {}),
    ...(standing === "wait" && waits !== undefined ? { waitsFor: waits } : {}),
    ...(answered === undefined ? {} : { answered }),
  };
}
