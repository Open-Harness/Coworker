import { Blueprint } from "orthograph";
import { Agent } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// `GET /settings/shared`.agents.
export default Blueprint.read(Agent, { where: ["workspace"], order: "oldest", page: 100, allowed: [member.of("workspace")] });
