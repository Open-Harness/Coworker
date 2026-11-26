import type { Read } from "../types.ts";
import { isJson, names, num, obj, str } from "./json.ts";

/* The App's installation: what it was given, and what it lost. */

const LOSES = new Set(["deleted", "suspend"]);

export function account(event: string, payload: unknown): Read {
  const installation = isJson(payload) ? num(obj(payload, "installation"), "id") : undefined;
  if (!isJson(payload) || installation === undefined) return { _tag: "Broken", why: `an ${event} of no installation` };
  const action = str(payload, "action") ?? "";
  if (event === "installation_repositories") {
    const lost = names(payload, "repositories_removed", "full_name");
    const got = names(payload, "repositories_added", "full_name");
    return { _tag: "Account", installation, works: true, says: `Repositories ${action}`, lost, got };
  }
  const repos = names(payload, "repositories", "full_name");
  if (LOSES.has(action))
    return {
      _tag: "Account",
      installation,
      works: false,
      says: action === "deleted" ? "The App was uninstalled" : "The App was suspended",
      lost: repos,
      got: [],
    };
  return {
    _tag: "Account",
    installation,
    works: true,
    says: `The installation was ${action}`,
    lost: [],
    got: action === "created" || action === "unsuspend" ? repos : [],
  };
}
