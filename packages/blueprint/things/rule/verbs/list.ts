import { Blueprint } from "orthograph";
import { Rule } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// The always-answers the workspace keeps. No screen lists them yet.
export default Blueprint.read(Rule, { where: ["workspace", "for"], order: "newest", page: 100, allowed: [member.of("workspace")] });
