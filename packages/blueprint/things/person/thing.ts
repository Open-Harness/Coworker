import { Blueprint } from "orthograph";
import { Mail, Name, Words } from "../../values/coworker.ts";

// A row in D1: a person is the same across workspaces, and so are their profile and how they are told (inventory, Settings).
export const Person = Blueprint.thing({
  description: "A person who signs in: their name, their proven mails, their time zone, and how and when they are told.",
  code: "PE",
  fields: { id: Blueprint.id("person"), name: Name, mail: Mail, zone: Name, tell: Words },
});
