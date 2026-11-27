import { Blueprint } from "orthograph";
import { Workspace } from "../thing.ts";
import { member } from "../roles.ts";

export default Blueprint.read(Workspace, {
  by: "id",
  fields: ["name", "address", "region", "people", "perDay", "tellAt", "state"],
  allowed: [member.of("id")],
});
