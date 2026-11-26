import type { ConnectGithubView, McpView } from "~/modules/views-workspace/types.ts";
import { at, read, type Fixture } from "./read.ts";

const tool = (
  name: string,
  says: string,
  readOnly: boolean,
  is: "on" | "ask" | "off" = readOnly ? "on" : "ask",
): McpView["servers"][number]["tools"][number] => ({ name, says, readOnly, is });
const works = { _tag: "Works", at: at("25 Nov 09:50") } as const;

export const MCP: McpView = {
  servers: [
    {
      id: "sentry",
      name: "Sentry",
      url: "https://mcp.sentry.example/mcp",
      signIn: { oauth: "bo" },
      by: "Bo Larsen",
      added: at("2 Nov 10:00"),
      state: works,
      usedBy: ["coding"],
      tools: [
        tool("list_issues", "Errors seen in the last days, with how many people", true),
        tool("get_issue", "One error, with its stack trace and the release it began in", true),
        tool("search_events", "Find events by words or by user", true),
        tool("resolve_issue", "Mark an error as fixed in a release", false),
        tool("assign_issue", "Give an error to a person", false, "off"),
      ],
    },
    {
      id: "customers",
      name: "Customer database",
      url: "https://db.acme.example/mcp",
      signIn: { secret: "customer-db-read" },
      by: "Ama Mensah",
      added: at("9 Nov 10:00"),
      state: works,
      usedBy: ["support"],
      tools: [
        tool("find_customer", "Look up a customer by name, mail or number", true),
        tool("list_orders", "Orders of one customer", true),
        tool("run_report", "Run one of the saved reports", true),
        tool("update_customer", "Change a customer’s details", false),
        tool("delete_customer", "Remove a customer", false, "off"),
      ],
    },
    {
      id: "search",
      name: "Search",
      url: "https://search.example/mcp",
      signIn: { secret: "search-key" },
      by: "Bo Larsen",
      added: at("21 Oct 10:00"),
      state: works,
      usedBy: ["sales"],
      tools: [
        tool("web_search", "Search the web, and return links with a line each", true),
        tool("fetch_page", "Read one page as text", true),
      ],
    },
  ],
};

/** The walk through connecting GitHub: nothing is installed yet, and what the app will be checked for is known. */
export const CONNECT_GITHUB: ConnectGithubView = {
  installed: null,
  repos: [],
  chosen: [],
  abilities: [
    { id: "read", does: "Read issues, pull requests, reviews and checks", needs: "Issues, Pull requests, Checks: read", missing: false },
    { id: "comment", does: "Comment, and reply on a line", needs: "Issues, Pull requests: write", missing: false },
    { id: "pr", does: "Open a pull request", needs: "Pull requests: write", missing: false },
    { id: "push", does: "Push to its own branches", needs: "Contents: write", missing: true },
    { id: "events", does: "Hear about new issues, comments and merges", needs: "Webhook, signed", missing: false },
  ],
};

export const MCP_PAGES: readonly Fixture[] = [
  read("/settings/mcp-servers", {}, MCP),
  read("/settings/connectors/github", {}, CONNECT_GITHUB),
];
