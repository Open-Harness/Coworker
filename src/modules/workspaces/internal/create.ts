import type { CreateWorkspace, CreateWorkspaceResult, WorkspacesDependencies } from "../types.ts";
import { checkAddress } from "./address.ts";
import { addressInUse, insertRow } from "./directory.ts";

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * Organization, then object, then directory row. A step that fails undoes the ones before it, so no organization is
 * left without its object and no object without its row.
 */
export async function createWorkspace(dependencies: WorkspacesDependencies, input: CreateWorkspace): Promise<CreateWorkspaceResult> {
  const { auth, database, objects, clock } = dependencies;
  const checked = checkAddress(input.address);
  if (!checked.ok) return { _tag: "InvalidAddress", reason: checked.reason };
  const { address } = checked;
  if (await addressInUse(database, address)) return { _tag: "AddressTaken" };
  const name = input.name.trim() === "" ? address : input.name.trim();
  const organization = await auth.createOrganization({ userId: input.userId, name, slug: address });
  if (organization._tag === "SlugTaken") return { _tag: "AddressTaken" };
  if (organization._tag === "Failed") return { _tag: "Failed", message: organization.message };
  const workspaceId = organization.organizationId;
  const { objectId, object } = objects.mint(input.region);
  const createdAt = clock.now();
  const undo = async (): Promise<void> => {
    await object.destroy().catch(() => undefined);
    await auth.deleteOrganization(workspaceId);
  };
  try {
    await object.provision({ workspaceId, name, address, region: input.region, createdBy: input.userId, createdAt });
  } catch (error) {
    await undo();
    return { _tag: "Failed", message: `The workspace could not be set up: ${message(error)}` };
  }
  if (!(await insertRow(database, { workspaceId, objectId, address, region: input.region, createdAt }))) {
    await undo();
    return { _tag: "AddressTaken" };
  }
  return { _tag: "Created", workspace: { workspaceId, name, address, region: input.region, role: "owner" } };
}
