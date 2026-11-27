import { Blueprint } from "orthograph";
import { Comment } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// The comments beside a playbook's lines.
export default Blueprint.read(Comment, {
  where: ["workspace", "manager", "part", "state"],
  order: "oldest",
  page: 200,
  allowed: [member.of("workspace")],
});
