import { Blueprint } from "orthograph";
import workspaceStore from "../../stores/workspace.ts";
import { Workspace } from "../workspace/thing.ts";
import { Manager } from "../manager/thing.ts";
import { Count, Kind, TriggerBy, When, Words } from "../../values/coworker.ts";

// What makes work come in for a manager, or what the co-worker does on its own (a routine), inside the workspace's
// object. Its runs and finds go to intake; a cron schedule is the workspace object's alarm.
export const Trigger = Blueprint.thing({
  description: "What makes something come in: a schedule, an event, a wait, or being asked; what it makes, and how often.",
  code: "TR",
  lives: workspaceStore,
  fields: {
    id: Blueprint.id("trg"),
    workspace: Workspace.fields.id,
    manager: Manager.fields.id,
    by: TriggerBy,
    on: Words,
    when: When,
    makes: Kind,
    only: Words,
    atMost: Count,
  },
});
