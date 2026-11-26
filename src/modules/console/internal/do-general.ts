import type { Did } from "~/modules/api/types.ts";
import { doings } from "~/modules/doings/service.ts";
import type { Thinking } from "~/modules/playbook/types.ts";
import type { Handler } from "./handlers.ts";

const refuse = (why: string): Did => ({ _tag: "Refused", why });
const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const done = (says: string, id: string | null = null): Did => ({ _tag: "Done", id, says, link: null });
const THINKING: readonly Thinking[] = ["off", "low", "medium", "high"];

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
  const [connection, model, thinking] = [text(values["connection"]), text(values["model"]), text(values["thinking"]) || "low"];
  const found = (await c.outside.connections()).find(({ id }) => id === connection);
  if (found === undefined) return refuse(`There is no connection "${connection}" here.`);
  if (found.check._tag !== "Works") return refuse(`${found.label} does not work now: ${found.check.error}`);
  if (!found.models.includes(model)) return refuse(`${found.label} does not list a model called "${model}".`);
  const level = THINKING.find((one) => one === thinking);
  if (level === undefined) return refuse(`Thinking is one of ${THINKING.join(", ")}.`);
  await c.store.set("choice", { connection, model, thinking: level });
  return done(sentence("models.default", { model, connection: found.label }, c.who.name));
};

export const generalHandlers: Readonly<Record<string, Handler>> = { "workspace.general": general, "models.default": defaultModel };
