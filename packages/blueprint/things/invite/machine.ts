import { Blueprint } from "orthograph";
import { Invite } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Invite, {
  states: ["sent", "taken", "lapsed"],
  moves: {
    send: { from: [], to: "sent", emits: Events.Invited },
    take: { from: ["sent"], to: "taken", emits: Events.InviteTaken },
    lapse: { from: ["sent"], to: "lapsed", emits: Events.InviteLapsed },
  },
  notFrom: { exit: 27 },
});
