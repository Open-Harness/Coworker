import type { Did } from "~/modules/api/types.ts";
import { doings } from "~/modules/doings/service.ts";
import type { Handler } from "./handlers.ts";
import { forgetNote, saveSoul } from "./coworker-memory.ts";

const refuse = (why: string): Did => ({ _tag: "Refused", why });
const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const forget: Handler = async (c, values) => {
  const note = await forgetNote(c, text(values["note"]));
  return note === undefined
    ? refuse(`There is no note "${text(values["note"])}" to forget.`)
    : { _tag: "Done", id: note.id, says: doings.sentence("note.forget", { note: note.says }, c.who.name), link: "/juno" };
};

const soul: Handler = async (c, values) => {
  const said = text(values["text"]);
  if (said === "") return refuse("A soul needs some words.");
  await saveSoul(c, said);
  return { _tag: "Done", id: null, says: doings.sentence("soul.save", {}, c.who.name), link: "/juno" };
};

/** What a person decides about the co-worker itself: what it forgets, and what it is told first. */
export const coworkerHandlers: Readonly<Record<string, Handler>> = { "note.forget": forget, "soul.save": soul };
