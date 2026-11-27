import { Blueprint } from "orthograph";
import { Account } from "../thing.ts";
import { machine } from "../machine.ts";
import { member } from "../../workspace/roles.ts";
import { ConnectorId } from "../../../values/coworker.ts";
import { Manager } from "../../manager/thing.ts";

// Doing `account.lend`. Registered; nothing presses it. The registry names an `account` the person has and `to`, a
// manager. The one who lends sees what it reads (spec X14). Off for the co-worker (delta D4).
export default Blueprint.operation(Account, {
  description: "Lend one of your own accounts to a manager.",
  payload: { workspace: Account.fields.workspace, connector: ConnectorId, to: Manager.fields.id },
  answer: { account: Account.fields.id },
  move: machine.moves.lend,
  allowed: [member.of("workspace")],
  idempotent: "request",
});
