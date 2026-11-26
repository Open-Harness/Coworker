/* Tools added without code. Names agree with `mcp` in MANAGERS (world.ts): Coding has Sentry, Support the Customer database, Sales Search. */
export type Setting = "on" | "ask" | "off";
export interface Tool { id: string; name: string; does: string; reads: boolean; setting: Setting; /** Set by a person, not by the rule. */ chosen?: true }
export interface Server extends Record<string, unknown> {
  id: string; name: string; address: string; signIn: string; by: string; added: string; checked: string; usedBy: readonly string[]; tools: readonly Tool[];
}
const t = (id: string, name: string, does: string, reads: boolean, setting?: Setting): Tool => ({ id, name, does, reads, setting: setting ?? (reads ? "on" : "ask"), ...(setting ? { chosen: true as const } : {}) });

export const SERVERS: readonly Server[] = [
  { id: "sentry", name: "Sentry", address: "https://mcp.sentry.example/mcp", signIn: "Signs in as Bo Larsen, with Sentry", by: "Bo Larsen", added: "2 Nov", checked: "09:50", usedBy: ["Coding"], tools: [
    t("list_issues", "list_issues", "Errors seen in the last days, with how many people", true),
    t("get_issue", "get_issue", "One error, with its stack trace and the release it began in", true),
    t("search_events", "search_events", "Find events by words or by user", true),
    t("resolve_issue", "resolve_issue", "Mark an error as fixed in a release", false),
    t("assign_issue", "assign_issue", "Give an error to a person", false, "off")] },
  { id: "customers", name: "Customer database", address: "https://db.acme.example/mcp", signIn: "A key, kept in Keys as customer-db-read", by: "Ama Mensah", added: "9 Nov", checked: "09:50", usedBy: ["Support"], tools: [
    t("find_customer", "find_customer", "Look up a customer by name, mail or number", true),
    t("list_orders", "list_orders", "Orders of one customer", true),
    t("run_report", "run_report", "Run one of the saved reports", true),
    t("update_customer", "update_customer", "Change a customer’s details", false),
    t("delete_customer", "delete_customer", "Remove a customer", false, "off")] },
  { id: "search", name: "Search", address: "https://search.example/mcp", signIn: "A key, kept in Keys as search-key", by: "Bo Larsen", added: "21 Oct", checked: "09:50", usedBy: ["Sales"], tools: [
    t("web_search", "web_search", "Search the web, and return links with a line each", true),
    t("fetch_page", "fetch_page", "Read one page as text", true)] },
];
export const SETTINGS: readonly { value: Setting; label: string }[] = [{ value: "on", label: "On" }, { value: "ask", label: "Ask" }, { value: "off", label: "Off" }];
export const WHO = ["Coding", "Docs", "Releases", "Support", "WhatsApp desk", "Sales"] as const;
