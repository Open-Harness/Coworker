import { Blueprint } from "orthograph";
import { Walk } from "./thing.ts";
import * as Events from "./events.ts";

// The stages of `setup/steps.ts:26-36`: said, the first questions, connect, found, the second questions, the draft, then
// made, thrown away, or carried by another walk. `ask`, `find` and `draft` are the co-worker's moves, which no person
// presses: delta D5.
export const machine = Blueprint.machine(Walk, {
  states: ["said", "questions", "connect", "found", "more", "draft", "made", "thrown", "carried"],
  moves: {
    start: { from: [], to: "said", emits: Events.WalkStarted },
    ask: { from: ["said", "found"], to: ["questions", "more"], emits: Events.WalkAsked },
    answer: { from: ["questions", "more"], to: ["connect", "draft"], emits: Events.WalkAnswered },
    connect: { from: ["connect"], to: "connect", emits: Events.WalkConnected },
    skip: { from: ["connect"], to: "connect", emits: Events.WalkSkipped },
    find: { from: ["connect"], to: "found", emits: Events.WalkFound },
    dispute: { from: ["found"], to: "found", emits: Events.WalkDisputed },
    draft: { from: ["more"], to: "draft", emits: Events.WalkDrafted },
    make: { from: ["draft"], to: "made", emits: Events.WalkMade },
    throw: { from: ["said", "questions", "connect", "found", "more", "draft"], to: "thrown", emits: Events.WalkThrown },
    carry: { from: ["said", "questions", "connect", "found", "more", "draft"], to: "carried", emits: Events.WalkCarried },
  },
  notFrom: { exit: 52 },
});
