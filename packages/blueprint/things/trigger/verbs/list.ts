import { Blueprint } from "orthograph";
import { Trigger } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// Juno's Triggers page, and a playbook's triggers part.
export default Blueprint.read(Trigger, {
  where: ["workspace", "manager", "state"],
  order: "oldest",
  page: 100,
  allowed: [member.of("workspace")],
});
