import { Blueprint } from "orthograph";
import { Workspace } from "../thing.ts";
import { owner } from "../roles.ts";
import { Words } from "../../../values/coworker.ts";

// Doing `workspace.export`: one file, everything but secrets (spec L4). The file is in R2; the answer is its link.
export default Blueprint.operation(Workspace, {
  description: "Export the workspace as one file: everything but secrets.",
  payload: { workspace: Workspace.fields.id },
  answer: { link: Words },
  allowed: [owner.of("workspace")],
  idempotent: "request",
});
