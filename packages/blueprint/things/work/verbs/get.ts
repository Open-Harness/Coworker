import { Blueprint } from "orthograph";
import { Work } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// `GET /m/:manager/work/:work`. Its threads, evidence, asks and activity are read from its object with it. `next`, `waits`,
// `ended`, `mandate` and `sentBack` are in the view and drawn by no screen (inventory, Gaps).
export default Blueprint.read(Work, {
  by: "id",
  fields: [
    "manager",
    "kind",
    "version",
    "title",
    "about",
    "from",
    "answers",
    "mandate",
    "doneWhen",
    "step",
    "priority",
    "cost",
    "why",
    "state",
  ],
  allowed: [member.of("workspace")],
});
