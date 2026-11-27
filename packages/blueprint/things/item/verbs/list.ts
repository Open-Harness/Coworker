import { Blueprint } from "orthograph";
import { Item } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// `GET /m/:manager/intake?from&state&before`. The screen filters on the page today and never sends the query.
export default Blueprint.read(Item, {
  where: ["workspace", "manager", "kind", "state"],
  order: "newest",
  page: 100,
  allowed: [member.of("workspace")],
});
