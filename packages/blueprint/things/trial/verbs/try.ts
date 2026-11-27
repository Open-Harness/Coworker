import { Blueprint } from "orthograph";
import { Trial } from "../thing.ts";
import { machine } from "../machine.ts";
import { builder } from "../../workspace/roles.ts";

// Doing `try.change`, which has a handler and is never pressed: "Try on past work" only toasts (`playbook/header.tsx:67`,
// inventory, Gaps). The registry sends the part as words; here it is the part and its changed files.
export default Blueprint.operation(Trial, {
  description: "Try a change to one part of the playbook on past work, before using it.",
  payload: { workspace: Trial.fields.workspace, manager: Trial.fields.manager, part: Trial.fields.part, changes: Trial.fields.changes },
  answer: { trial: Trial.fields.id },
  move: machine.moves.try,
  allowed: [builder.of("workspace")],
  idempotent: "request",
});
