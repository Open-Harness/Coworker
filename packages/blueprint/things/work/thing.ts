import { Blueprint } from "orthograph";
import { Workspace } from "../workspace/thing.ts";
import { Manager } from "../manager/thing.ts";
import { Person } from "../person/thing.ts";
import { Cents, Checks, Count, Kind, Priority, Step, ThreadRef, Title, VersionNumber, Words } from "../../values/coworker.ts";

// An actor: one Durable Object per piece of work, which holds its one Pi Harness (the settled decision). `step` is the
// playbook's data, written by `work.move`, not a state (inventory, question 1; delta D1). The board, counts and rail list
// a D1 index row per work, kept from this object by an outbox: a projection Orthograph can't say (delta D2).
export const Work = Blueprint.thing({
  description: "A piece of work a manager took on: what it is, where it came from, its step, who answers, and done when.",
  code: "WK",
  lives: "actor",
  fields: {
    id: Blueprint.id("work"),
    workspace: Workspace.fields.id,
    manager: Manager.fields.id,
    kind: Kind,
    version: VersionNumber,
    title: Title,
    about: Words,
    from: ThreadRef,
    answers: Person.fields.id,
    mandate: Words,
    doneWhen: Checks,
    step: Step,
    priority: Priority,
    order: Count,
    cost: Cents,
    why: Words,
  },
});
