import { Blueprint, Schema } from "orthograph";
import workspaceStore from "../../stores/workspace.ts";
import { Workspace } from "../workspace/thing.ts";
import { Checks, Name, Words } from "../../values/coworker.ts";

// A box a thread works in, shared across managers, inside the workspace's object. Its secrets are `key` rows in the vault,
// named here; a manager keeps its own copy (inventory, The nouns).
export const Environment = Blueprint.thing({
  description: "A box for threads to work in: its size, how it is set up, and the secrets it gets by name.",
  code: "EN",
  lives: workspaceStore,
  fields: {
    id: Blueprint.id("env"),
    workspace: Workspace.fields.id,
    name: Name,
    size: Blueprint.value(Schema.Literals(["small", "medium", "large"])),
    setUp: Words,
    secrets: Checks,
  },
});
