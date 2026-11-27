import { Blueprint } from "orthograph";
import { Ask } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// `GET /inbox`: a person's open asks. The inbox's standing (asks, waits, know, done) is a rollup of it.
export default Blueprint.read(Ask, {
  where: ["workspace", "to", "need", "work", "state"],
  order: "oldest",
  page: 100,
  allowed: [member.of("workspace")],
});
