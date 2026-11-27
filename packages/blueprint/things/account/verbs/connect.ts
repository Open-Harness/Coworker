import { Blueprint } from "orthograph";
import { Account } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../workspace/roles.ts";
import { ConnectorRefused } from "../errors.ts";

// Doing `connector.connect` (`settings/pages/connectors.tsx:147`, `connect-github.tsx:43`); no handler today (inventory, Gaps).
export default Blueprint.operation(Account, {
  description: "Connect an account on a connector for the workspace.",
  payload: { workspace: Account.fields.workspace, connector: Account.fields.connector },
  answer: { account: Account.fields.id },
  move: machine.moves.connect,
  errors: [ConnectorRefused],
  allowed: [owner.of("workspace")],
  idempotent: "request",
});
