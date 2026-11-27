import { Blueprint } from "orthograph";
import { Thread } from "../thing.ts";
import { machine } from "../machine.ts";
import { member } from "../../workspace/roles.ts";

// Not registered: "Stop this thread" only toasts (`thread/composer.tsx:32-40`, inventory, Gaps). Declared here; the
// binding marks it planned. The work goes on; its manager decides what next.
export default Blueprint.operation(Thread, {
  description: "Stop one thread of a piece of work.",
  payload: { workspace: Thread.fields.workspace, work: Thread.fields.work, thread: Thread.fields.id },
  answer: {},
  move: machine.moves.stop,
  allowed: [member.of("workspace")],
  idempotent: "request",
});
