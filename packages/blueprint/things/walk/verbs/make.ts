import { Blueprint } from "orthograph";
import { Walk } from "../thing.ts";
import { machine } from "../machine.ts";
import { builder } from "../../workspace/roles.ts";
import { Manager } from "../../manager/thing.ts";

// `POST /set-up/:walk {is: "make it"}` (`playbook/changes.ts:63`), from the draft. It ends in `manager.make`: one
// operation behind two doors (inventory, Gaps). /managers/new/:template/check links a template id where a walk id belongs.
export default Blueprint.operation(Walk, {
  description: "Make the manager from the draft, under another manager.",
  payload: { workspace: Walk.fields.workspace, walk: Walk.fields.id, above: Manager.fields.above },
  answer: { manager: Manager.fields.id },
  move: machine.moves.make,
  allowed: [builder.of("workspace")],
  idempotent: "request",
});
