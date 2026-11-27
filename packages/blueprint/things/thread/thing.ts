import { Blueprint } from "orthograph";
import workStore from "../../stores/work.ts";
import { Workspace } from "../workspace/thing.ts";
import { Work } from "../work/thing.ts";
import { Cents, Count, ModelChoice, Name, Report, ThreadRole, VersionNumber, Words } from "../../values/coworker.ts";

// One agent's run on a piece of work, inside the work's object: a fork of the work's conversation that does, or a fresh
// one that checks and never saw the doing (spec W5; delta D6). Its lines are the Pi transcript, not fields; big diffs are
// in R2. The threads page lists a D1 index row per thread (delta D2).
export const Thread = Blueprint.thing({
  description: "An agent working on a piece of work, or checking it: its brief, its model, what it cost, and how it ended.",
  code: "TH",
  lives: workStore,
  fields: {
    id: Blueprint.id("thr"),
    workspace: Workspace.fields.id,
    work: Work.fields.id,
    agent: Name,
    role: ThreadRole,
    under: Blueprint.id("thr"),
    knew: Count,
    model: ModelChoice,
    version: VersionNumber,
    brief: Words,
    cost: Cents,
    report: Report,
  },
});
