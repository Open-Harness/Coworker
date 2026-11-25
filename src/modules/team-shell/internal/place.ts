import type { SettingsPage } from "~/modules/team-core/types.ts";
import type { Place } from "../types.ts";

const SETTINGS: readonly SettingsPage[] = [
  "profile",
  "notifications",
  "general",
  "members",
  "roles",
  "keys",
  "usage",
  "billing",
  "security",
  "audit",
];

/** The screen at `/ws/<workspace>/…`. */
export function placeOf(path: string): Place {
  const [, , , part, id, page] = path.split("/").map(decodeURIComponent);
  if (part === undefined && path.split("/").filter(Boolean).length === 2) return { kind: "home" };
  if (part === "inbox" || part === "people" || part === "environments") return { kind: part };
  if (part === "m" && id !== undefined)
    return {
      kind: "manager",
      managerId: id,
      page: page === "chat" || page === "overview" || page === "mission" || page === "events" || page === "settings" ? page : "board",
    };
  if (part === "build" && (id === "agents" || id === "skills" || id === "templates")) return { kind: "build", page: id };
  const settings = part === "settings" ? SETTINGS.find((name) => name === id) : undefined;
  return settings === undefined ? { kind: "elsewhere" } : { kind: "settings", page: settings };
}
