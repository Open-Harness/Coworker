import { Blueprint } from "orthograph";
import { Ask } from "./thing.ts";
import * as Events from "./events.ts";

// Open, then answered, or gone when what it was about ended. `ask` and `go` are the loop's (delta D5).
export const machine = Blueprint.machine(Ask, {
  states: ["open", "answered", "gone"],
  moves: {
    ask: { from: [], to: "open", emits: Events.Asked },
    answer: { from: ["open"], to: "answered", emits: Events.AskAnswered },
    go: { from: ["open"], to: "gone", emits: Events.AskGone },
  },
  notFrom: { exit: 75 },
});
