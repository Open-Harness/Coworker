import { Blueprint } from "orthograph";
import { Account } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// `GET /settings/connectors`, and a manager's connectors. Never a token: those are in the vault.
export default Blueprint.read(Account, {
  where: ["workspace", "connector", "holder", "state"],
  order: "oldest",
  page: 100,
  allowed: [member.of("workspace")],
});
