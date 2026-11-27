import { Blueprint } from "orthograph";
import { Walk } from "../thing.ts";
import { machine } from "../machine.ts";
import { builder } from "../../workspace/roles.ts";
import { ConnectorId } from "../../../values/coworker.ts";

// `POST /set-up/:walk {is: "connected"}` (`look.tsx:39`). Not a registered doing.
export default Blueprint.operation(Walk, {
  description: "Say a connector is connected, so the co-worker can look at it.",
  payload: { workspace: Walk.fields.workspace, walk: Walk.fields.id, connector: ConnectorId },
  answer: {},
  move: machine.moves.connect,
  allowed: [builder.of("workspace")],
  idempotent: "request",
});
