import { Blueprint } from "orthograph";
import workspaceStore from "../../stores/workspace.ts";
import { Workspace } from "../workspace/thing.ts";
import { Manager } from "../manager/thing.ts";
import { Kind, ThreadRef, VersionNumber, Words } from "../../values/coworker.ts";

// Something that came in, and what intake decided about it. In the workspace's object, not D1: "at most one manager takes
// it" (spec I5) needs one serial place that sees every manager hearing that place (inventory, Where state lives).
export const Item = Blueprint.thing({
  description: "Something that came in for a manager, what intake decided, why, and whether a person said it was right.",
  code: "IT",
  lives: workspaceStore,
  fields: {
    id: Blueprint.id("item"),
    workspace: Workspace.fields.id,
    manager: Manager.fields.id,
    from: ThreadRef,
    kind: Kind,
    version: VersionNumber,
    said: Words,
    mandate: Words,
  },
});
