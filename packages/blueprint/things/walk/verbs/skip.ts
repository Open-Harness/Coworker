import { Blueprint } from "orthograph";
import { Walk } from "../thing.ts";
import { machine } from "../machine.ts";
import { builder } from "../../workspace/roles.ts";
import { ConnectorId } from "../../../values/coworker.ts";

// `POST /set-up/:walk {is: "skipped"}` (`look.tsx:39`). Not a registered doing.
export default Blueprint.operation(Walk, {
  description: "Skip a connector: the co-worker sets the manager up without looking at it.",
  payload: { workspace: Walk.fields.workspace, walk: Walk.fields.id, connector: ConnectorId },
  answer: {},
  move: machine.moves.skip,
  allowed: [builder.of("workspace")],
  idempotent: "request",
});
