import { Blueprint } from "orthograph";
import { Work } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// `GET /m/:manager/board`: the columns are the kind's steps. A list over actors is refused (F5), so this reads the D1 index
// row each work's object keeps: delta D2.
export default Blueprint.read(Work, {
  where: ["workspace", "manager", "step", "kind", "state"],
  order: "oldest",
  page: 200,
  allowed: [member.of("workspace")],
});
