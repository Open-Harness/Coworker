import { Blueprint } from "orthograph";
import { Audit } from "../thing.ts";
import { owner } from "../../workspace/roles.ts";

// `GET /settings/audit-log?by&outcome&before`. Today the screen never sends the query or `next` (inventory, Gaps); here
// `where` and the page's cursor are the filters and the next page. Nothing writes a line but the commit: no operation.
export default Blueprint.read(Audit, {
  where: ["workspace", "by", "outcome"],
  order: "newest",
  page: 100,
  allowed: [owner.of("workspace")],
});
