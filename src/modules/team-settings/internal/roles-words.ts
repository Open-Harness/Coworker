import type { ActionRow, Permission, PermissionSet, Role, RolesData } from "../types.ts";

/** What a category of the action catalogue is called on a screen. */
const CATEGORY: Readonly<Record<string, string>> = {
  read: "Look at the board, tasks and mission",
  board: "Change the board's lanes and fields",
  tasks: "Work on tasks",
  triage: "Decide what incoming events become",
  runs: "Start and stop agent runs",
  mission: "Edit the mission and its pages",
  outside: "Answer people outside the workspace",
  "who-may-ask": "Change who may ask the manager",
  sources: "Connect and change sources",
  itself: "Change the manager's own settings",
  workspace: "Run the workspace",
};
export const categoryLabel = (category: string): string => CATEGORY[category] ?? category;

export const PERMISSION_LABEL: Readonly<Record<Permission, string>> = { on: "On", ask: "Ask", off: "Off" };
export const PERMISSIONS: readonly Permission[] = ["on", "ask", "off"];

/** What a preset says of one action: its own line for the action, else for the category, else off. */
export const presetSays = (set: PermissionSet, action: ActionRow): Permission =>
  set.actions[action.id] ?? set.categories[action.category] ?? "off";

/** What a preset says of a whole category, or `mixed` when its actions differ. */
export function categorySays(set: PermissionSet, actions: readonly ActionRow[]): Permission | "mixed" {
  const says = new Set(actions.map((action) => presetSays(set, action)));
  const [only] = [...says];
  return says.size === 1 && only !== undefined ? only : "mixed";
}

export const actionsOf = (roles: RolesData, category: string): readonly ActionRow[] =>
  roles.actions.filter((action) => action.category === category);

export const PRESET_ORDER: readonly Role[] = ["owner", "builder", "member"];
