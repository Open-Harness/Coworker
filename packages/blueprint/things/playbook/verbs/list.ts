import { Blueprint } from "orthograph";
import { Playbook } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// `GET /m/:manager/versions`: one row per version.
export default Blueprint.read(Playbook, {
  where: ["workspace", "manager"],
  order: "newest",
  page: 50,
  allowed: [member.of("workspace")],
});
