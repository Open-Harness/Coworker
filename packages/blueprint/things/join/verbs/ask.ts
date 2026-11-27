import { Blueprint } from "orthograph";
import { Join } from "../thing.ts";
import { machine } from "../machine.ts";

// `POST /api/join/request` from /join. The Owner gets an ask in that workspace's inbox.
export default Blueprint.operation(Join, {
  description: "Ask to join a workspace.",
  payload: { workspace: Join.fields.workspace, person: Join.fields.person },
  answer: { join: Join.fields.id },
  move: machine.moves.ask,
  allowed: [Blueprint.signedIn],
  idempotent: "request",
});
