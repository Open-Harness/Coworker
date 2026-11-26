import type { Blank } from "~/modules/templates/types.ts";
import type { FillView } from "~/modules/views-manager/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { ok, problem } from "./around.ts";
import { fillView } from "./templates.ts";
import { foundAt } from "./place-found.ts";

/** What a blank is when the repo says so: it is found there, not asked. */
export const fromRepo = (blank: Blank): boolean => blank.best?.from === "the repo";

/** A template tried at a place: what is found there answers the blanks that the repo answers, and the place is the place blank's own. */
export async function tryTemplate(c: ConsoleDeps, id: string, body: unknown) {
  const place = typeof body === "object" && body !== null && "place" in body && typeof body.place === "string" ? body.place.trim() : "";
  if (place === "") return problem(422, "Send {place}: where to read.");
  const view = await fillView(c, id);
  if (view._tag !== "Ok") return view;
  const found = await foundAt(c, place);
  const answers: Readonly<Record<string, string>> = { install: found.install, test: found.test };
  const blanks = view.value.blanks.map((blank): FillView["blanks"][number] => {
    if (blank.is.a === "place") return { ...blank, best: { value: place, from: "you picked it" } };
    const read = answers[blank.id];
    return fromRepo(blank) && read !== undefined ? { ...blank, best: { value: read, from: "the repo" } } : blank;
  });
  return ok<FillView>({ ...view.value, blanks, found });
}
