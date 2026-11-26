import type { Auth, SignedIn } from "~/modules/auth/types.ts";
import type { Workspaces } from "~/modules/workspaces/types.ts";
import { routeGeneral } from "./settings-general.ts";
import { routeKeys } from "./settings-keys.ts";
import { routeWorkspaceLevel } from "./settings-workspace.ts";
import { routePeopleSettings } from "./settings-people.ts";
import { routeWork } from "./settings-work.ts";

/**
 * The Settings screens, each under `/api/workspaces/<id>/`:
 * `general`, `logo`, `export`, `templates`, `email[/test]` · `roles`, `permissions`, `access`, `me[/profile|/notifications]` · `models/<id>[/check]`, `secrets`,
 * `connections` · `environments/<id>[/test]`, `agents[/<id>]`, `skills[/<id>]`, `usage`, `budgets`.
 * A route that is not for the method sent falls through to the older routes of the same name.
 */
export const SETTINGS =
  /^\/api\/workspaces\/([A-Za-z0-9_-]{8,64})\/(general|logo|export|templates|email(?:\/test)?|roles|permissions|access|me(?:\/profile|\/notifications)?|usage|budgets|connections|secrets(?:\/[A-Za-z0-9_.-]{1,80})?|models\/[A-Za-z0-9_-]{4,80}(?:\/check)?|environments\/[A-Za-z0-9_-]{4,80}(?:\/test)?|agents(?:\/[A-Za-z0-9_-]{4,80})?|skills(?:\/[A-Za-z0-9_-]{4,80})?)$/u;

export async function routeSettings(
  auth: Auth,
  workspaces: Workspaces,
  person: SignedIn,
  request: Request,
  match: RegExpExecArray,
): Promise<Response | undefined> {
  const [, workspaceId = "", part = ""] = match;
  const area = part.split("/")[0] ?? "";
  if (["general", "logo", "export"].includes(area)) return routeGeneral(workspaces, person, request, workspaceId, part);
  if (["roles", "permissions", "access", "me"].includes(area))
    return routePeopleSettings(auth, workspaces, person, request, workspaceId, part);
  if (area === "templates" || area === "email") return routeWorkspaceLevel(workspaces, person, request, workspaceId, part);
  if (["models", "secrets", "connections"].includes(area)) return routeKeys(workspaces, person, request, workspaceId, part);
  return routeWork(workspaces, person, request, workspaceId, part);
}
