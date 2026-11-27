import { Blueprint } from "orthograph";
import { Account } from "../thing.ts";
import { machine } from "../machine.ts";
import { builder } from "../../workspace/roles.ts";

// Doing `connector.check` (`settings/pages/connectors.tsx:54`, `connect-github.tsx:59`); no handler today (inventory, Gaps).
export default Blueprint.operation(Account, {
  description: "Check that an account still works, and what it may reach.",
  payload: { workspace: Account.fields.workspace, account: Account.fields.id },
  answer: {},
  move: machine.moves.check,
  allowed: [builder.of("workspace")],
  idempotent: "request",
});
