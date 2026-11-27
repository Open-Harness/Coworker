import { Blueprint } from "orthograph";
import { Thread } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// `GET /m/:manager/threads/:thread`. Its lines (said, thought, told, called, diff) are the transcript, read with it (D6).
export default Blueprint.read(Thread, {
  by: "id",
  fields: ["work", "agent", "role", "under", "knew", "model", "version", "brief", "cost", "report", "state"],
  allowed: [member.of("workspace")],
});
