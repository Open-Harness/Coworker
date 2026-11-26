import { Blueprint } from "orthograph";
import { Workspace } from "./thing.ts";

// A Member sees and uses; a Builder changes managers; an Owner also changes the workspace, people, keys and billing (P5).
// Each is decided on the workspace a payload names: `owner.of("workspace")`. Nothing here tells a person from the co-worker
// acting for them (spec C6): delta D4.
export const member = Blueprint.role(Workspace, {
  rule: (workspace, principal) => principal.kind === "person" && workspace.people[principal.person] !== undefined,
});
export const builder = Blueprint.role(Workspace, {
  rule: (workspace, principal) => {
    if (principal.kind !== "person") return false;
    const role = workspace.people[principal.person];
    return role === "Owner" || role === "Builder";
  },
});
export const owner = Blueprint.role(Workspace, {
  rule: (workspace, principal) => principal.kind === "person" && workspace.people[principal.person] === "Owner",
});
