import { Blueprint } from "orthograph";
import { Coworker } from "../thing.ts";
import { owner } from "../../workspace/roles.ts";
import { MoreThanPerson } from "../errors.ts";
import { DoingId, Permission } from "../../../values/coworker.ts";

// Doing `coworker.may`. The May do page presses it once per changed row; no handler today (inventory, Gaps). That the
// co-worker is a principal of its own, never more than its person, is delta D4.
export default Blueprint.operation(Coworker, {
  description: "Say whether the co-worker may do one doing alone, with a yes, or not at all.",
  payload: { workspace: Coworker.fields.workspace, coworker: Coworker.fields.id, doing: DoingId, permission: Permission },
  answer: {},
  errors: [MoreThanPerson],
  allowed: [owner.of("workspace")],
  idempotent: "request",
});
