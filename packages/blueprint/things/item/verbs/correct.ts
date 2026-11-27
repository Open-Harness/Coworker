import { Blueprint } from "orthograph";
import { Item } from "../thing.ts";
import { member } from "../../workspace/roles.ts";
import { Should } from "../../../values/coworker.ts";

// Doing `intake.correct` (`intake/index.tsx:69`). Two corrections send a kind back to ask (spec I8). The
// handler records `ItemCorrected`; no state moves.
export default Blueprint.operation(Item, {
  description: "Say whether intake was right about an item.",
  payload: { workspace: Item.fields.workspace, manager: Item.fields.manager, item: Item.fields.id, should: Should },
  answer: {},
  allowed: [member.of("workspace")],
  idempotent: "request",
});
