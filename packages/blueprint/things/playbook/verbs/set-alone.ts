import { Blueprint } from "orthograph";
import { Playbook } from "../thing.ts";
import { builder } from "../../workspace/roles.ts";
import { Alone, Kind } from "../../../values/coworker.ts";

// Doing `kind.alone`. Registered; nothing presses it. It goes back to ask by itself after two corrections (spec I8).
export default Blueprint.operation(Playbook, {
  description: "Say what one kind of work does when nobody asked for it: off, watch, ask or do.",
  payload: { workspace: Playbook.fields.workspace, manager: Playbook.fields.manager, kind: Kind, alone: Alone },
  answer: {},
  allowed: [builder.of("workspace")],
  idempotent: "request",
});
