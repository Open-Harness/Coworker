import { Blueprint } from "orthograph";
import { Skill } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// `GET /settings/shared`.skills.
export default Blueprint.read(Skill, { where: ["workspace", "layer"], order: "oldest", page: 100, allowed: [member.of("workspace")] });
