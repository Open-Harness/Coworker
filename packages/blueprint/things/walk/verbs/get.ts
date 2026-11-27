import { Blueprint } from "orthograph";
import { Walk } from "../thing.ts";
import { builder } from "../../workspace/roles.ts";

// `GET /set-up/:walk`, and the draft playbook pages under it.
export default Blueprint.read(Walk, {
  by: "id",
  fields: ["said", "rounds", "wants", "objective", "draft", "state"],
  allowed: [builder.of("workspace")],
});
