import { Blueprint } from "orthograph";
import { Person } from "../thing.ts";
import { self } from "../roles.ts";

// Not registered: Profile's and Notifications' Save only toast today (inventory, Gaps). Planned.
export default Blueprint.operation(Person, {
  description: "Change your name, time zone, and how and when you are told.",
  payload: { person: Person.fields.id, name: Person.fields.name, zone: Person.fields.zone, tell: Person.fields.tell },
  answer: {},
  allowed: [self.of("person")],
  idempotent: "request",
});
