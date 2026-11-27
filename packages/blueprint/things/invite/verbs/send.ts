import { Blueprint } from "orthograph";
import { Invite } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../workspace/roles.ts";

// Doing `person.invite`. Registered; the Invite button only toasts.
export default Blueprint.operation(Invite, {
  description: "Invite someone by mail, with a role.",
  payload: { workspace: Invite.fields.workspace, mail: Invite.fields.mail, role: Invite.fields.role },
  answer: { invite: Invite.fields.id },
  move: machine.moves.send,
  allowed: [owner.of("workspace")],
  idempotent: "request",
});
