import type { Did } from "~/modules/api/types.ts";
import { doings } from "~/modules/doings/service.ts";
import type { Role } from "~/modules/doings/types.ts";
import type { Handler } from "./handlers.ts";

const refuse = (why: string): Did => ({ _tag: "Refused", why });
const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const ROLES: readonly Role[] = ["Owner", "Builder", "Member"];

/** A person's role. An Owner's: the workspace keeps at least one. */
const role: Handler = async (c, values) => {
  const [person, asked] = [text(values["person"]), text(values["role"])];
  const named = ROLES.find((one) => one.toLowerCase() === asked.toLowerCase());
  if (named === undefined) return refuse(`A role is one of ${ROLES.join(", ")}.`);
  const member = c.people.find(({ id }) => id === person);
  if (member === undefined) return refuse("That person is not in this workspace.");
  const done = await c.outside.people.role(person, named);
  if (done._tag === "Refused") return refuse(done.why);
  return { _tag: "Done", id: person, says: doings.sentence("person.role", { person: member.name, role: named }, c.who.name), link: null };
};

/** Who leaves loses everything at once. */
const remove: Handler = async (c, values) => {
  const person = text(values["person"]);
  const member = c.people.find(({ id }) => id === person);
  if (member === undefined) return refuse("That person is not in this workspace.");
  const done = await c.outside.people.remove(person);
  if (done._tag === "Refused") return refuse(done.why);
  return { _tag: "Done", id: person, says: doings.sentence("person.remove", { person: member.name }, c.who.name), link: null };
};

export const peopleHandlers: Readonly<Record<string, Handler>> = { "person.role": role, "person.remove": remove };
