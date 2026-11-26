import type { Did } from "~/modules/api/types.ts";
import { doings } from "~/modules/doings/service.ts";
import type { Handler } from "./handlers.ts";
import { chosenFrom, isChosen } from "./model-choice.ts";

const refuse = (why: string): Did => ({ _tag: "Refused", why });
const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const done = (says: string, id: string | null = null): Did => ({ _tag: "Done", id, says, link: null });

const sentence = (id: string, words: Readonly<Record<string, string>>, by: string): string => doings.sentence(id, words, by);

/** The workspace's name and what it may spend a day. The address stays as it is: the managers' addresses are on it. */
const general: Handler = async (c, values) => {
  const name = text(values["name"]);
  if (name !== "" && name !== c.workspace.name) {
    const renamed = await c.outside.rename(name);
    if (renamed._tag === "Refused") return refuse(renamed.why);
  }
  if (values["perDay"] !== undefined && values["perDay"] !== "") {
    const perDay = Number(values["perDay"]);
    if (!Number.isFinite(perDay) || perDay < 0) return refuse("What may be spent in a day is a number, not less than nothing.");
    await c.store.set("perDay", perDay);
  }
  return done(sentence("workspace.general", {}, c.who.name));
};

/** Which model answers when nobody has said otherwise: one that is connected, works, and lists it. */
const defaultModel: Handler = async (c, values) => {
  const chosen = await chosenFrom(c, values);
  if (!isChosen(chosen)) return chosen;
  await c.store.set("choice", { connection: chosen.connection, model: chosen.model, thinking: chosen.thinking });
  return done(sentence("models.default", { model: chosen.model, connection: chosen.label }, c.who.name));
};

/** Everything the workspace holds, as a file an Owner downloads: what is kept, and never a secret's value. */
const exportAll: Handler = async (c) => ({
  _tag: "Done",
  id: c.workspace.id,
  says: sentence("workspace.export", {}, c.who.name),
  link: `/api/workspaces/${c.workspace.id}/export`,
});

const DAY = 86_400_000;
const GRACE = 30;

/** The workspace's name typed is the press: it is removed for good thirty days on, and until then it is as it was. */
const deleteWorkspace: Handler = async (c, values) => {
  if (text(values["name"]) !== c.workspace.name)
    return refuse(`That is not the name of this workspace. Type "${c.workspace.name}" to delete it.`);
  const at = c.clock.now() + GRACE * DAY;
  const scheduled = await c.outside.retire(at);
  if (scheduled._tag === "Refused") return refuse(scheduled.why);
  const day = new Date(at).toISOString().slice(0, 10);
  return done(
    `${sentence("workspace.delete", { name: c.workspace.name }, c.who.name)}. It is removed for good in ${GRACE} days, on ${day}.`,
  );
};

export const generalHandlers: Readonly<Record<string, Handler>> = {
  "workspace.general": general,
  "models.default": defaultModel,
  "workspace.export": exportAll,
  "workspace.delete": deleteWorkspace,
};
