import { Blueprint } from "orthograph";
import { Trial } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// `GET /m/:manager/compare/:trial`. Its cases, asks and guards are rows of the evals, read with it.
export default Blueprint.read(Trial, {
  by: "id",
  fields: ["manager", "of", "part", "changes", "why", "differ", "worse", "state"],
  allowed: [member.of("workspace")],
});
