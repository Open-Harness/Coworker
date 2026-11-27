import { Blueprint } from "orthograph";
import { Trigger } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// `GET /m/:manager/triggers/:trigger`. Its runs, finds and cost are intake's rows.
export default Blueprint.read(Trigger, {
  by: "id",
  fields: ["manager", "by", "on", "when", "makes", "only", "atMost", "state"],
  allowed: [member.of("workspace")],
});
