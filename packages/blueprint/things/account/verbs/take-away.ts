import { Blueprint } from "orthograph";
import { Account } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../workspace/roles.ts";

// Doing `connector.take_away` (`settings/pages/connectors.tsx:68`); no handler today (inventory, Gaps).
export default Blueprint.operation(Account, {
  description: "Take an account away from the workspace. Work that used it is told.",
  payload: { workspace: Account.fields.workspace, account: Account.fields.id },
  answer: {},
  move: machine.moves.remove,
  allowed: [owner.of("workspace")],
  idempotent: "request",
});
