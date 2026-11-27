import { Blueprint } from "orthograph";
import { Workspace } from "../thing.ts";
import { machine } from "../machine.ts";
import { AddressTaken } from "../errors.ts";

// `POST /api/workspaces` from /start. The model, key, limit and repos /start collects are their own operations after it.
export default Blueprint.operation(Workspace, {
  description: "Make a workspace. The one who makes it is its first Owner.",
  payload: { name: Workspace.fields.name, address: Workspace.fields.address, region: Workspace.fields.region },
  answer: { workspace: Workspace.fields.id },
  move: machine.moves.make,
  errors: [AddressTaken],
  allowed: [Blueprint.signedIn],
  idempotent: "request",
});
