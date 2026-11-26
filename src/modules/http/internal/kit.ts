import { mayOpen } from "~/modules/access/service.ts";
import type { Page } from "~/modules/access/types.ts";
import { createActions } from "~/modules/actions/service.ts";
import type { Permission, PermissionSet } from "~/modules/actions/types.ts";
import type { Preset, SignedIn } from "~/modules/auth/types.ts";
import { personOf } from "~/modules/protocol/service.ts";
import { callSettings } from "~/modules/settings/service.ts";
import type { SettingsInput, SettingsName, SettingsOutput } from "~/modules/settings/types.ts";
import type { WorkspaceApi } from "~/modules/workspace/types.ts";
import type { Need, Workspaces } from "~/modules/workspaces/types.ts";

/** Shared by the Settings routes: narrowing what a request sent, answering in one shape, and who may do what. */

export const problem = (status: number, message: string): Response => Response.json({ error: message }, { status });
export const fresh = (body: unknown, status = 200): Response => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
export const text = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

/** The JSON body, or undefined when there is none or it is not an object. */
export async function bodyOf(request: Request): Promise<Readonly<Record<string, unknown>> | undefined> {
  const sent: unknown = await request.json().catch(() => undefined);
  return isRecord(sent) ? sent : undefined;
}

/** Deleting asks for `{"confirm": <what is being deleted>}` in the body, so a stray request never deletes. */
export async function confirmed(request: Request, what: string): Promise<boolean> {
  return (await bodyOf(request))?.["confirm"] === what;
}

export const by = (person: SignedIn) => {
  const { id, name } = personOf(person);
  return { kind: "person", id, name } as const;
};

export type Reach = { readonly object: WorkspaceApi; readonly role: Preset } | Response;

/** The workspace's object once the person passes `need`, or the refusal to send. */
export async function reach(workspaces: Workspaces, person: SignedIn, workspaceId: string, need: Need, why: string): Promise<Reach> {
  const reached = await workspaces.reach(person.userId, workspaceId, need);
  if (reached._tag === "NotMember") return problem(404, "No such workspace");
  if (reached._tag === "NotOwner") return problem(403, why);
  return reached;
}

/** One typed settings call for the person, or 404 if the workspace has no data. */
export async function settings<K extends SettingsName>(
  object: WorkspaceApi,
  person: SignedIn,
  name: K,
  input: SettingsInput<K>,
): Promise<SettingsOutput<K> | Response> {
  const result = await callSettings(object, name, input, by(person));
  return "_tag" in result && result._tag === "NotProvisioned" ? problem(404, "No such workspace") : (result as SettingsOutput<K>);
}

/** What the person's own changes over their preset say. Empty for someone with none. */
export async function ownOf(object: WorkspaceApi, person: SignedIn): Promise<PermissionSet> {
  const own = await callSettings(object, "ownOf", { person: personOf(person).id }, by(person));
  return "_tag" in own ? { categories: {}, actions: {} } : own;
}

/** What the person's preset, over which their own changes say, makes of one catalogue action: on, off or ask. */
export const settingOf = (person: SignedIn, role: Preset, own: PermissionSet, actionId: string): Permission =>
  createActions({
    sources: { manager: () => ({ categories: {}, actions: {} }), person: () => ({ preset: role, own }) },
    handlers: {},
    audit: () => undefined,
    clock: { now: () => 0 },
  }).check({ kind: "person", id: person.userId, name: person.name }, actionId);

/** Whether the person may do one catalogue action outright. */
export const mayDo = (person: SignedIn, role: Preset, own: PermissionSet, actionId: string): boolean =>
  settingOf(person, role, own, actionId) === "on";

/** The refusal for a page the person may not open, or undefined when they may. The shell asks the same question. */
export async function closed(object: WorkspaceApi, person: SignedIn, role: Preset, page: Page): Promise<Response | undefined> {
  return mayOpen({ role, own: await ownOf(object, person) }, page) ? undefined : problem(403, "You can't open this. Ask an Owner.");
}

const STATUS: Readonly<Record<string, number>> = {
  NotFound: 404,
  Invalid: 400,
  InvalidAddress: 400,
  NameTaken: 409,
  AddressTaken: 409,
  TooLarge: 413,
  WrongType: 415,
  Unavailable: 409,
  Failed: 502,
};

/** A result as the response: its tag decides the status, its fields are the body. */
export const said = (result: { readonly _tag: string }, ok = 200): Response => fresh(result, STATUS[result._tag] ?? ok);
