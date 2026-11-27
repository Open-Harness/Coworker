import { Blueprint } from "orthograph";
import { Note } from "./thing.ts";
import * as Events from "./events.ts";

// The co-worker proposes a note; a person keeps it or leaves it, and a kept one can be forgotten. `propose` is the
// loop's own move, with no operation a person presses: delta D5.
export const machine = Blueprint.machine(Note, {
  states: ["proposed", "kept", "left", "forgotten"],
  moves: {
    propose: { from: [], to: "proposed", emits: Events.NoteProposed },
    accept: { from: ["proposed"], to: "kept", emits: Events.NoteKept },
    leave: { from: ["proposed"], to: "left", emits: Events.NoteLeft },
    forget: { from: ["kept"], to: "forgotten", emits: Events.NoteForgotten },
  },
  notFrom: { exit: 34 },
});
