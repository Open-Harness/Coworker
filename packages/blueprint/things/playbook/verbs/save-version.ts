import { Blueprint } from "orthograph";
import { Playbook } from "../thing.ts";
import { builder } from "../../workspace/roles.ts";
import { VersionStale } from "../errors.ts";

// Doing `version.save`. Today the screen sends the files it read, not the edits (`changes.ts:55`, inventory, Gaps). `version` is the one read: a newer one refuses.
export default Blueprint.operation(Playbook, {
  description: "Save the playbook as a new version: the files as changed, from the version they were read at.",
  payload: {
    workspace: Playbook.fields.workspace,
    manager: Playbook.fields.manager,
    version: Playbook.fields.version,
    files: Playbook.fields.files,
  },
  answer: {},
  errors: [VersionStale],
  allowed: [builder.of("workspace")],
  idempotent: "request",
});
