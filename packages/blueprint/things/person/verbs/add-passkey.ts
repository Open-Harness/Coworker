import { Blueprint } from "orthograph";
import { Person } from "../thing.ts";
import { self } from "../roles.ts";

// Doing `security.add_passkey`. Registered; the button only toasts.
export default Blueprint.operation(Person, {
  description: "Add a passkey as a way to sign in.",
  payload: { person: Person.fields.id },
  answer: {},
  allowed: [self.of("person")],
  idempotent: "request",
});
