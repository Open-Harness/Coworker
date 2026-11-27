import { Blueprint } from "orthograph";
import { Manager } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// `GET /tree`: the managers page and the shell's tree.
export default Blueprint.read(Manager, {
  where: ["workspace", "above", "state"],
  order: "oldest",
  page: 200,
  allowed: [member.of("workspace")],
});
