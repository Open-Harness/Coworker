import { Blueprint } from "orthograph";
import { Invite } from "./thing.ts";

export const Invited = Blueprint.event({ invite: Invite.fields.id, workspace: Invite.fields.workspace, mail: Invite.fields.mail });
export const InviteTaken = Blueprint.event({ invite: Invite.fields.id });
export const InviteLapsed = Blueprint.event({ invite: Invite.fields.id });
