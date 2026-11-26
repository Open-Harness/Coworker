/** Everything the workspace is made of and runs on, in three groups. Work and managers are in the sidebar; this is the rest. */
export const GROUPS = [
  { title: "Workspace", items: ["General", "Members", "Keys", "Usage", "Audit log", "Billing"] },
  { title: "What managers use", items: ["Connectors", "MCP servers", "Agents", "Skills", "Environments", "Templates"] },
  { title: "You", items: ["Profile", "Notifications", "Security"] },
] as const;

export const slugOf = (item: string): string => item.toLowerCase().replaceAll(" ", "-");
export const ITEMS: readonly string[] = GROUPS.flatMap((group) => [...group.items]);
/** Pages that are reached from another page and are not in the list on the left. */
export const HIDDEN: readonly string[] = ["Connect GitHub"];

/** The page an address names: the first one when it names none. */
export const at = (slug: string | undefined): string =>
  ITEMS.find((item) => slugOf(item) === slug) ?? HIDDEN.find((item) => slugOf(item) === slug) ?? "General";

export const pathOf = (item: string): string => `/settings/${slugOf(item)}`;
