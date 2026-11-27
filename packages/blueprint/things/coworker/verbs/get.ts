import { Blueprint } from "orthograph";
import { Coworker } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// `GET /coworker`: every Juno page reads it.
export default Blueprint.read(Coworker, {
  by: "id",
  fields: ["identity", "voice", "soul", "never", "talking", "mays", "whole", "tellAt", "parts"],
  allowed: [member.of("workspace")],
});
