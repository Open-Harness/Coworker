import { Blueprint } from "orthograph";
import { Environment } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// `GET /settings/shared`.environments.
export default Blueprint.read(Environment, { where: ["workspace"], order: "oldest", page: 100, allowed: [member.of("workspace")] });
