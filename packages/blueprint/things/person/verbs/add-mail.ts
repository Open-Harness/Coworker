import { Blueprint } from "orthograph";
import { Person } from "../thing.ts";
import { self } from "../roles.ts";
import { MailTaken } from "../errors.ts";

// Doing `profile.add_mail`. Today the screen sends `{}` where the field is `mail` (inventory, Gaps).
export default Blueprint.operation(Person, {
  description: "Add a mail. It counts once it is proven, by a link sent to it.",
  payload: { person: Person.fields.id, mail: Person.fields.mail },
  answer: {},
  errors: [MailTaken],
  allowed: [self.of("person")],
  idempotent: "request",
});
