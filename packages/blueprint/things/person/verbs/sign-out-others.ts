import { Blueprint } from "orthograph";
import { Person } from "../thing.ts";
import { self } from "../roles.ts";

// Doing `security.sign_out_others`.
export default Blueprint.operation(Person, {
  description: "Sign out of every session but this one.",
  payload: { person: Person.fields.id },
  answer: {},
  allowed: [self.of("person")],
  idempotent: "request",
});
