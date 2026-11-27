import { Blueprint } from "orthograph";
import { Ask } from "../thing.ts";
import { machine } from "../machine.ts";
import { member } from "../../workspace/roles.ts";
import { NotAnOption, NotAskedOfYou } from "../errors.ts";

// Doing `ask.answer`, which no screen presses: the inbox reaches it as `POST /inbox/:ask {answer}` (`inbox/index.tsx:78`),
// a second door (inventory, Gaps). A mail draft's Send answers its ask the same way. Off for the co-worker (delta D4).
export default Blueprint.operation(Ask, {
  description: "Answer an ask. The work that waits for it goes on.",
  payload: { workspace: Ask.fields.workspace, ask: Ask.fields.id, answer: Ask.fields.answer },
  answer: {},
  move: machine.moves.answer,
  errors: [NotAnOption, NotAskedOfYou],
  allowed: [member.of("workspace")],
  idempotent: "request",
});
