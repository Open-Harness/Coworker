/** Everything the workspace is made of and runs on, in three groups. Work and managers are in the sidebar; this is the rest. */
export const GROUPS = [
  { title: "Workspace", items: ["General", "Members", "Keys", "Usage", "Audit log", "Billing"] },
  { title: "What managers use", items: ["Connectors", "MCP servers", "Agents", "Skills", "Environments", "Templates"] },
  { title: "You", items: ["Profile", "Notifications", "Security"] },
] as const;
export const slugOf = (item: string) => `set-${item.toLowerCase().replaceAll(" ", "-")}`;
export const ITEMS: readonly string[] = GROUPS.flatMap((g) => [...g.items]);
/** Pages that are reached from another page and are not in the list on the left. */
export const HIDDEN: readonly string[] = ["Connect GitHub"];
export const at = (hash: string) => ITEMS.find((i) => slugOf(i) === hash) ?? HIDDEN.find((i) => slugOf(i) === hash) ?? "General";
