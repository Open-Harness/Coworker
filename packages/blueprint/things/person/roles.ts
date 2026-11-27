import { Blueprint } from "orthograph";
import { Person } from "./thing.ts";

/** The person themselves. */
export const self = Blueprint.role(Person, { rule: (person, principal) => principal.kind === "person" && principal.person === person.id });
