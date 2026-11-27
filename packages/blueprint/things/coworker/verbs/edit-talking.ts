import { Blueprint } from "orthograph";
import { Coworker } from "../thing.ts";
import { owner } from "../../workspace/roles.ts";
import { Words } from "../../../values/coworker.ts";

// Doing `talking.edit`. Pressed by the Talking page's Save; no handler today (inventory, Gaps).
export default Blueprint.operation(Coworker, {
  description: "Change how the co-worker talks: to whom, how, what it may say, and how it signs.",
  payload: { workspace: Coworker.fields.workspace, coworker: Coworker.fields.id, who: Words, how: Words, may: Words, sign: Words },
  answer: {},
  allowed: [owner.of("workspace")],
  idempotent: "request",
});
