import { Blueprint } from "orthograph";
import { Call } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// A work's and a thread's calls, as the thread page and its tool calls draw them. The workspace's audit log is `audit`.
export default Blueprint.read(Call, {
  where: ["workspace", "work", "thread", "state"],
  order: "newest",
  page: 100,
  allowed: [member.of("workspace")],
});
