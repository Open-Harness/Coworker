import { Blueprint } from "orthograph";
import workspaceStore from "../../stores/workspace.ts";
import { Workspace } from "../workspace/thing.ts";
import { Cents, Mays, Name, Spending, Talking, Words } from "../../values/coworker.ts";

// One per workspace, kept inside the workspace's object: Juno's configuration. It has no lifecycle (inventory, The nouns).
// Its memory notes and its routines are their own things (`note`, `trigger`); its history is the audit table.
export const Coworker = Blueprint.thing({
  description: "The workspace's co-worker: who it is, its soul, how it talks, what it may do alone, and what it may spend.",
  code: "CW",
  lives: workspaceStore,
  fields: {
    id: Blueprint.id("cw"),
    workspace: Workspace.fields.id,
    identity: Name,
    voice: Words,
    soul: Words,
    never: Words,
    talking: Talking,
    mays: Mays,
    whole: Cents,
    tellAt: Cents,
    parts: Spending,
  },
});
