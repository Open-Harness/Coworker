import { Blueprint } from "orthograph";
import { Account } from "../thing.ts";
import { owner } from "../../workspace/roles.ts";

// Not registered: the GitHub page's repo choice is local state (`connect-github.tsx:21`, inventory, Gaps). Declared here;
// the binding marks it planned.
export default Blueprint.operation(Account, {
  description: "Choose which repositories the GitHub account may reach.",
  payload: { workspace: Account.fields.workspace, account: Account.fields.id, places: Account.fields.places },
  answer: {},
  allowed: [owner.of("workspace")],
  idempotent: "request",
});
