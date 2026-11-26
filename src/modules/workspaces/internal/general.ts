import type { By } from "~/modules/actions/types.ts";
import { personOf } from "~/modules/protocol/service.ts";
import { callSettings } from "~/modules/settings/service.ts";
import type { GeneralView } from "~/modules/settings/types.ts";
import type { WorkspaceApi } from "~/modules/workspace/types.ts";
import type { ExportResult, UpdateGeneral, UpdateGeneralResult, WorkspacesDependencies } from "../types.ts";
import { checkAddress } from "./address.ts";
import { addressInUse, setAddress } from "./directory.ts";
import { reachWorkspace } from "./members.ts";

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** Who is asking, as the audit log names them: their sign-in email and name. */
async function byOf({ auth }: WorkspacesDependencies, userId: string): Promise<By> {
  const person = personOf((await auth.userOf(userId)) ?? { email: userId, name: userId });
  return { kind: "person", id: person.id, name: person.name };
}

const generalOf = async (object: WorkspaceApi, by: By): Promise<GeneralView | undefined> => {
  const general = await callSettings(object, "general", null, by);
  return "_tag" in general ? undefined : general;
};

/**
 * The name and address are kept in three places (the object, the directory row, the organization), so they change
 * together or not at all: the object first, then the others, and the object put back if they fail.
 */
async function rename(
  { auth, database }: WorkspacesDependencies,
  object: WorkspaceApi,
  workspaceId: string,
  next: { readonly name: string; readonly address: string },
  before: GeneralView,
  by: By,
): Promise<UpdateGeneralResult | undefined> {
  await callSettings(object, "rename", next, by);
  try {
    if (!(await setAddress(database, workspaceId, next.address))) return await undoRename(object, before, by, { _tag: "AddressTaken" });
    await auth.renameOrganization(workspaceId, next.name, next.address);
    return undefined;
  } catch (error) {
    await setAddress(database, workspaceId, before.address).catch(() => false);
    return undoRename(object, before, by, { _tag: "Failed", message: message(error) });
  }
}

async function undoRename(object: WorkspaceApi, before: GeneralView, by: By, because: UpdateGeneralResult): Promise<UpdateGeneralResult> {
  await callSettings(object, "rename", { name: before.name, address: before.address }, by).catch(() => undefined);
  return because;
}

/** The workspace's name, address, time zone and default model, changed by an Owner. */
export async function updateGeneral(
  dependencies: WorkspacesDependencies,
  userId: string,
  workspaceId: string,
  input: UpdateGeneral,
): Promise<UpdateGeneralResult> {
  const { auth, database } = dependencies;
  const reached = await reachWorkspace(dependencies, userId, workspaceId, "settings");
  if (reached._tag !== "Reached") return reached;
  const { object } = reached;
  try {
    const by = await byOf(dependencies, userId);
    const current = await generalOf(object, by);
    if (current === undefined) return { _tag: "NotMember" };
    const name = input.name?.trim() ?? current.name;
    if (name === "" || name.length > 60) return { _tag: "Invalid", reason: "A workspace needs a name of up to 60 characters" };
    const checked = input.address === undefined ? { ok: true as const, address: current.address } : checkAddress(input.address);
    if (!checked.ok) return { _tag: "InvalidAddress", reason: checked.reason };
    const moved = checked.address !== current.address;
    if (moved && ((await addressInUse(database, checked.address)) || (await auth.isSlugTaken(checked.address))))
      return { _tag: "AddressTaken" };
    const preferences = {
      ...(input.timeZone === undefined ? {} : { timeZone: input.timeZone }),
      ...(input.defaultModel === undefined ? {} : { defaultModel: input.defaultModel }),
    };
    const saved = await callSettings(object, "setGeneral", preferences, by);
    if (saved._tag !== "Saved") return saved._tag === "Invalid" ? saved : { _tag: "NotMember" };
    if (name !== current.name || moved) {
      const failed = await rename(dependencies, object, workspaceId, { name, address: checked.address }, current, by);
      if (failed !== undefined) return failed;
    }
    const general = await generalOf(object, by);
    return general === undefined ? { _tag: "NotMember" } : { _tag: "Updated", general };
  } catch (error) {
    return { _tag: "Failed", message: message(error) };
  }
}

/** Everything the workspace holds, as a zip an Owner downloads. Never a secret's value. */
export async function exportData(dependencies: WorkspacesDependencies, userId: string, workspaceId: string): Promise<ExportResult> {
  const reached = await reachWorkspace(dependencies, userId, workspaceId, "settings");
  if (reached._tag !== "Reached") return reached;
  try {
    const members = (await dependencies.auth.membersOf(workspaceId)).map(({ name, email, role }) => ({ name, email, role }));
    const exported = await callSettings(reached.object, "exportAll", { members }, await byOf(dependencies, userId));
    return exported._tag === "Exported" ? exported : { _tag: "NotMember" };
  } catch (error) {
    return { _tag: "Failed", message: message(error) };
  }
}
