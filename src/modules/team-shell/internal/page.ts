import type { Page } from "~/modules/access/types.ts";

const WORKSPACE_SETTINGS = ["general", "members", "roles", "keys", "usage", "billing", "security", "audit"];
/** Which page an address opens, for asking whether the person may. `undefined` is an address that opens no page. */
export function pageOf(path: string): Page | undefined {
  const [, , part, id, area] = path.split("/").filter(Boolean).map(decodeURIComponent);
  if (part === undefined) return "home";
  if (part === "inbox") return "inbox";
  if (part === "people" || part === "environments") return part;
  if (part === "build") return id === "agents" || id === "skills" || id === "templates" ? id : undefined;
  if (part === "settings") {
    if (id === "profile" || id === "notifications") return id;
    return WORKSPACE_SETTINGS.includes(id ?? "") ? "workspace" : undefined;
  }
  if (part !== "m" || id === undefined) return undefined;
  if (area === undefined) return "board";
  if (area === "chat" || area === "overview" || area === "mission" || area === "events") return area;
  if (area === "tasks") return "task";
  if (area === "runs") return "run";
  return area === "settings" ? "manager-settings" : undefined;
}
