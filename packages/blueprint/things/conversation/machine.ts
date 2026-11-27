import { Blueprint } from "orthograph";
import { Conversation } from "./thing.ts";
import * as Events from "./events.ts";

// The manager holds it; a person who writes in it takes it; handing it back returns it. `follow` and `stop` are the loop's
// (delta D5). Telling the manager something moves nothing.
export const machine = Blueprint.machine(Conversation, {
  states: ["managed", "person", "stopped"],
  moves: {
    follow: { from: [], to: "managed", emits: Events.ConversationFollowed },
    take: { from: ["managed", "person"], to: "person", emits: Events.ConversationTaken },
    handBack: { from: ["person"], to: "managed", emits: Events.ConversationHandedBack },
    stop: { from: ["managed", "person"], to: "stopped", emits: Events.ConversationStopped },
  },
  notFrom: { exit: 87 },
});
