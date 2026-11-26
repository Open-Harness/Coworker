/*
 * Every drawing, and the page of the app that must look like it. `id` is the drawing's hash in `design/`; `page` is under
 * `/ws/acme` unless it begins with two slashes. `then`: what is pressed before they are compared.
 * `reads`: what the page reads when the read itself is what is drawn (slow, failing, gone, or no connection).
 */
export type How = "slow" | "fails" | "gone" | "offline";
export interface Screen {
  readonly id: string;
  readonly page: string;
  readonly then?: "mod+k";
  readonly reads?: Readonly<Record<string, How>>;
  /** Not signed in. */
  readonly out?: true;
}

const s = (id: string, page: string, more: Partial<Screen> = {}): Screen => ({ id, page, ...more });
const PARTS = ["objective", "workflow", "triggers", "agents", "skills", "reach", "evals"] as const;

export const SCREENS: readonly Screen[] = [
  // The door
  s("signin", "//sign-in", { out: true }),
  s("signup", "//sign-up", { out: true }),
  s("join", "//join"),
  s("start", "//start"),
  // The workspace
  s("home", ""),
  s("palette", "", { then: "mod+k" }),
  s("inbox", "/inbox"),
  s("chats", "/chats"),
  s("chat-support", "/chats/support"),
  s("chat-support-october", "/chats/october"),
  s("system", "/overview"),
  s("root", "/managers"),
  ...["about", "soul", "talking", "triggers", "skills", "memory", "may-do", "spending", "history"].map((page) => s(`juno-${page}`, page === "about" ? "/juno" : `/juno/${page}`)),
  // A manager
  s("m-sales-overview", "/m/sales"),
  s("m-coding-overview", "/m/coding"),
  s("m-sales-intake", "/m/sales/intake"),
  s("m-sales-search", "/m/sales/triggers/signs"),
  s("m-coding-board", "/m/coding/board"),
  s("m-sales-board", "/m/sales/board"),
  s("task", "/m/coding/work/ACME-412"),
  s("m-coding-threads", "/m/coding/threads"),
  s("thread", "/m/coding/threads/thread-46"),
  s("m-coding-settings", "/m/coding/settings"),
  // A playbook, there and as a draft
  s("m-sales-playbook", "/m/sales/playbook"),
  ...PARTS.map((part) => s(`m-sales-playbook-${part}`, `/m/sales/playbook/${part}`)),
  s("m-sales-playbook-versions", "/m/sales/playbook/versions"),
  s("m-sales-playbook-compare", "/m/sales/playbook/compare/signs"),
  s("draft", "/set-up/more-calls/draft"),
  ...PARTS.map((part) => s(`draft-${part}`, `/set-up/more-calls/draft/${part}`)),
  s("draft-skill-bos-voice", "/set-up/more-calls/draft/skills/bos-voice"),
  // Connectors
  s("m-sales-connectors", "/m/sales/connectors"),
  s("m-support-connectors", "/m/support/connectors"),
  s("m-sales-connectors-crm", "/m/sales/connectors/crm"),
  s("m-support-connectors-email", "/m/support/connectors/email"),
  s("m-whatsapp-connectors-whatsapp", "/m/whatsapp/connectors/whatsapp"),
  s("m-coding-connectors-slack", "/m/coding/connectors/slack"),
  s("m-coding-connectors-github", "/m/coding/connectors/github"),
  // Making one
  s("new", "/managers/new"),
  s("new-fill", "/managers/new/repo"),
  s("new-check", "/managers/new/repo/check?place=acme/api"),
  s("setup", "/set-up"),
  s("setup-ask", "/set-up/at-ask"),
  s("setup-connect", "/set-up/at-connect"),
  s("setup-found", "/set-up/at-found"),
  s("setup-ask-2", "/set-up/at-ask-2"),
  s("setup-draft", "/set-up/more-calls"),
  // Settings
  ...["general", "members", "keys", "usage", "audit-log", "billing", "connectors", "mcp-servers", "agents", "skills", "environments", "templates", "profile", "notifications", "security"].map((page) =>
    s(`set-${page}`, `/settings/${page}`),
  ),
  s("set-connect-github", "/settings/connectors/github"),
  // What a screen is when it has nothing to show
  s("state-loading", "/m/coding/board", { reads: { "/m/coding/board": "slow" } }),
  s("state-error", "/m/coding", { reads: { "/m/coding": "fails" } }),
  s("state-empty", "/m/docs/intake"),
  s("state-notyet", "/m/releases"),
  s("state-offline", "/m/coding/board", { reads: { "/m/coding/board": "offline" } }),
  s("state-gone", "/m/coding/work/ACME-377", { reads: { "/m/coding/work/ACME-377": "gone" } }),
];
