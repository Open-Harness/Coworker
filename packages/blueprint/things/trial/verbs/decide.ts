import { Blueprint, Schema } from "orthograph";
import { Trial } from "../thing.ts";
import { machine } from "../machine.ts";
import { builder } from "../../workspace/roles.ts";

// Not registered: "Keep N" and "Use N+1" on the compare page only toast (`compare/index.tsx:175`, inventory, Gaps).
// Declared here; the binding marks it planned. Using it saves the next version.
export default Blueprint.operation(Trial, {
  description: "Decide a trial: keep the version there is, or use the change as the next version.",
  payload: {
    workspace: Trial.fields.workspace,
    manager: Trial.fields.manager,
    trial: Trial.fields.id,
    is: Blueprint.value(Schema.Literals(["keep", "use"])),
  },
  answer: {},
  move: machine.moves.decide,
  allowed: [builder.of("workspace")],
  idempotent: "request",
});
