import { Blueprint } from "orthograph";
import { Playbook } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// `GET /m/:manager/playbook?version` and every part page under it.
export default Blueprint.read(Playbook, {
  by: "id",
  fields: ["manager", "version", "files", "objective", "reach"],
  allowed: [member.of("workspace")],
});
