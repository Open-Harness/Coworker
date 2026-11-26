import type { Ask } from "~/modules/asks/types.ts";
import type { InboxItem } from "~/modules/views-workspace/types.ts";
import { at } from "./read.ts";

/* What waits at 09:54 on Wednesday 25 November. Names and numbers are the story's. */
type Rest = Pick<InboxItem, "from" | "preview" | "standing" | "otherwise" | "looked" | "links"> &
  Partial<Pick<InboxItem, "proposes" | "isNew" | "beside">>;
interface Made {
  readonly id: string;
  readonly to: string;
  readonly manager: string;
  readonly title: string;
  readonly work?: string;
  readonly need: Ask["need"];
  readonly question: string;
  readonly why: string;
  readonly options: Ask["options"];
  readonly came: string;
  readonly by?: string;
  readonly state?: Ask["state"];
}

export function item(m: Made, rest: Rest): InboxItem {
  const ask: Ask = {
    id: m.id,
    to: m.to,
    need: m.need,
    about: { ...(m.work === undefined ? {} : { work: m.work }), manager: m.manager, title: m.title },
    question: m.question,
    why: m.why,
    options: m.options,
    best: m.options[0]?.id ?? null,
    shows: null,
    at: at(m.came),
    by: m.by === undefined ? null : at(m.by),
    then: [],
    else: "wait",
    reminded: 0,
    state: m.state ?? { _tag: "Open" },
  };
  const { from, preview, standing, otherwise, looked, links } = rest;
  return {
    ask,
    from,
    preview,
    standing,
    proposes: rest.proposes ?? false,
    isNew: rest.isNew ?? false,
    looked,
    otherwise,
    links,
    beside: rest.beside ?? {},
  };
}
export const answered = (answer: string, when: string): Ask["state"] => ({
  _tag: "Answered",
  by: "ama",
  answer,
  where: "Here, inbox",
  at: at(when),
});
export const opt = (id: string, label: string, then: string) => ({ id, label, then });
