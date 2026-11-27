import { Blueprint } from "orthograph";
import { Comment } from "./thing.ts";
import * as Events from "./events.ts";

// Open, then the co-worker offers a change, answers, or makes a case: those three are its moves, which no person presses
// (delta D5). A person takes an offered change or leaves it.
export const machine = Blueprint.machine(Comment, {
  states: ["open", "offered", "taken", "left", "answered", "case"],
  moves: {
    make: { from: [], to: "open", emits: Events.Commented },
    offer: { from: ["open"], to: "offered", emits: Events.ChangeOffered },
    answer: { from: ["open"], to: "answered", emits: Events.CommentAnswered },
    makeCase: { from: ["open"], to: "case", emits: Events.CommentBecameCase },
    accept: { from: ["offered"], to: "taken", emits: Events.ChangeTaken },
    leave: { from: ["offered"], to: "left", emits: Events.ChangeLeft },
  },
  notFrom: { exit: 48 },
});
