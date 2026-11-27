import { Blueprint } from "orthograph";
import { Account } from "../thing.ts";
import { owner } from "../../workspace/roles.ts";
import { NothingToScan } from "../errors.ts";
import { Words } from "../../../values/coworker.ts";

// Doing `connector.scan` (`settings/pages/connectors.tsx:61`); no handler today. WhatsApp's "Scan the code" goes here.
export default Blueprint.operation(Account, {
  description: "Link a phone to a WhatsApp account by scanning a code.",
  payload: { workspace: Account.fields.workspace, account: Account.fields.id },
  answer: { code: Words },
  errors: [NothingToScan],
  allowed: [owner.of("workspace")],
  idempotent: "request",
});
