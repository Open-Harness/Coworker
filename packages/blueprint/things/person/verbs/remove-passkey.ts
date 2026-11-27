import { Blueprint } from "orthograph";
import { Person } from "../thing.ts";
import { self } from "../roles.ts";
import { LastWay } from "../errors.ts";
import { Name } from "../../../values/coworker.ts";

// Doing `security.remove_passkey`. Today the screen sends `{way}` where the field is `passkey`.
export default Blueprint.operation(Person, {
  description: "Take away a passkey.",
  payload: { person: Person.fields.id, passkey: Name },
  answer: {},
  errors: [LastWay],
  allowed: [self.of("person")],
  idempotent: "request",
});
