import { Blueprint } from "orthograph";
import { Note } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// The Memory page: what is kept, and what waits for a yes.
export default Blueprint.read(Note, {
  where: ["workspace", "state"],
  order: "newest",
  page: 100,
  allowed: [member.of("workspace")],
});
