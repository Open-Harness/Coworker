import { Blueprint } from "orthograph";
import { Person } from "../thing.ts";
import { self } from "../roles.ts";
import { Name } from "../../../values/coworker.ts";

// Doing `session.sign_out`: one session, from the list on Security.
export default Blueprint.operation(Person, {
  description: "Sign out of one session.",
  payload: { person: Person.fields.id, session: Name },
  answer: {},
  allowed: [self.of("person")],
  idempotent: "request",
});
