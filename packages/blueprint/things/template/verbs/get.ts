import { Blueprint } from "orthograph";
import { Template } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// `GET /templates/:template`: the blanks /managers/new/:template asks for.
export default Blueprint.read(Template, {
  by: "id",
  fields: ["name", "about", "whose", "version", "blanks", "by"],
  allowed: [member.of("workspace")],
});
