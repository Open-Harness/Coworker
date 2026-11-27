import { Blueprint } from "orthograph";
import { Manager } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// `GET /m/:manager` and its settings page. Its counts (open, waiting, cost) come from the work index: delta D2.
export default Blueprint.read(Manager, {
  by: "id",
  fields: ["name", "above", "version", "objective", "answers", "model", "perWork", "perDay", "template", "state"],
  allowed: [member.of("workspace")],
});
