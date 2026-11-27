import { Blueprint } from "orthograph";
import { Walk } from "../thing.ts";
import { machine } from "../machine.ts";
import { builder } from "../../workspace/roles.ts";
import { FindingNotFound } from "../errors.ts";
import { Key, Words } from "../../../values/coworker.ts";

// `POST /set-up/:walk {is: "that is wrong"}` (`look.tsx:144`). Not a registered doing.
export default Blueprint.operation(Walk, {
  description: "Say one thing the co-worker found is wrong, and why.",
  payload: { workspace: Walk.fields.workspace, walk: Walk.fields.id, finding: Key, why: Words },
  answer: {},
  move: machine.moves.dispute,
  errors: [FindingNotFound],
  allowed: [builder.of("workspace")],
  idempotent: "request",
});
