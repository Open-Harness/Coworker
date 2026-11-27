import { Blueprint } from "orthograph";
import { Thread } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// `GET /m/:manager/threads`, as a tree by `under`. It reads the D1 thread index, kept from each work's object (delta D2).
export default Blueprint.read(Thread, {
  where: ["workspace", "work", "role", "state"],
  order: "newest",
  page: 100,
  allowed: [member.of("workspace")],
});
