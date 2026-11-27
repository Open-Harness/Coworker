import { Blueprint } from "orthograph";
import { Mcp } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// `GET /settings/mcp-servers`. Never the sign-in.
export default Blueprint.read(Mcp, { where: ["workspace", "state"], order: "oldest", page: 100, allowed: [member.of("workspace")] });
