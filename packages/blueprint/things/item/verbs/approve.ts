import { Blueprint, Schema } from "orthograph";
import { Item } from "../thing.ts";
import { machine } from "../machine.ts";
import { member } from "../../workspace/roles.ts";

// Not registered: "Yes, take it on" and "No" on an item that waits press `intake.correct` today, a correction where an
// approval belongs (`intake/inspector.tsx:54-55`, inventory, Gaps). Declared here; the binding marks it planned.
export default Blueprint.operation(Item, {
  description: "Answer an item intake asked about: take it on, or leave it.",
  payload: {
    workspace: Item.fields.workspace,
    manager: Item.fields.manager,
    item: Item.fields.id,
    is: Blueprint.value(Schema.Literals(["take", "leave"])),
  },
  answer: {},
  move: machine.moves.approve,
  allowed: [member.of("workspace")],
  idempotent: "request",
});
