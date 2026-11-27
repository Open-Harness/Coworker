import { Blueprint } from "orthograph";
import workspaceStore from "../../stores/workspace.ts";
import { Workspace } from "../workspace/thing.ts";
import { Person } from "../person/thing.ts";
import { Work } from "../work/thing.ts";
import { Thread } from "../thread/thing.ts";
import { At, Checks, Need, Words } from "../../values/coworker.ts";

// One ask of one person, in the workspace's object: one place, since it can be answered from the inbox, GitHub, Slack or
// mail (spec A4), and an always-rule spans works (A6). Answering it signals the work object that waits (delta D7).
export const Ask = Blueprint.thing({
  description: "A question to one person: what it needs of them, about what, why, the options, and by when.",
  code: "AS",
  lives: workspaceStore,
  fields: {
    id: Blueprint.id("ask"),
    workspace: Workspace.fields.id,
    to: Person.fields.id,
    need: Need,
    work: Work.fields.id,
    thread: Thread.fields.id,
    about: Words,
    question: Words,
    why: Words,
    options: Checks,
    by: At,
    answer: Words,
  },
});
