import type { BillingView, KeysView, UsageView } from "~/modules/views-workspace/types.ts";
import { at, read, type Fixture } from "./read.ts";

/* The money: what is connected to think with, the week's cost, and the plan. The week is the managers' 369 dollars everywhere. */
const levels = {
  sonnet: ["off", "low", "medium", "high"],
  haiku: ["off", "low"],
  opus: ["low", "medium", "high"],
} as const;
const model = (
  name: string,
  id: string,
  input: number,
  output: number,
  levelsOf: KeysView["models"][number]["models"][number]["levels"],
): KeysView["models"][number]["models"][number] => ({
  connection: "anthropic",
  model: id,
  name,
  works: true,
  price: { input, cached: input / 10, output },
  thinks: true,
  levels: levelsOf,
});

const secret = (name: string, of: string, usedBy: readonly string[], used: string): KeysView["secrets"][number] => ({
  name,
  of,
  usedBy,
  set: at("14 Sep 10:00"),
  usedAt: at(used),
});
export const KEYS: KeysView = {
  models: [
    {
      id: "anthropic",
      label: "Anthropic",
      source: "ANTHROPIC_KEY",
      works: true,
      says: "Works",
      checked: at("25 Nov 09:50"),
      models: [
        model("Claude Sonnet 5.5", "claude-sonnet-5-5", 3, 15, levels.sonnet),
        model("Claude Haiku 5.5", "claude-haiku-5-5", 1, 5, levels.haiku),
        model("Claude Opus 5.5", "claude-opus-5-5", 15, 75, levels.opus),
      ],
    },
  ],
  choice: { connection: "anthropic", model: "claude-sonnet-5-5", thinking: "medium" },
  secrets: [
    secret("ANTHROPIC_KEY", "Models", ["Every manager"], "25 Nov 09:54"),
    secret("GITHUB_APP_KEY", "GitHub", ["Coding", "Docs", "Releases"], "25 Nov 09:54"),
    secret("SLACK_BOT_TOKEN", "Slack", ["Coding", "Sales", "Juno"], "25 Nov 09:05"),
    secret("MAIL_PASSWORD", "Email", ["Support", "Sales", "Releases"], "25 Nov 09:31"),
    secret("WHATSAPP_SESSION_KEY", "WhatsApp", ["WhatsApp desk"], "25 Nov 08:10"),
    secret("CRM_API_KEY", "CRM", ["Sales"], "25 Nov 09:20"),
    secret("SENTRY_TOKEN", "Sentry (MCP server)", ["Coding"], "24 Nov 11:00"),
    secret("CUSTOMER_DB_URL", "Customer database (MCP server)", ["Support"], "25 Nov 09:31"),
  ],
};

const DAY = ["19 Nov", "20 Nov", "21 Nov", "22 Nov", "23 Nov", "24 Nov", "25 Nov"] as const;
const COST = [57, 62, 66, 25, 23, 74, 62] as const;
const BOXES = [11, 12, 13, 5, 4, 14, 12] as const;
export const USAGE: UsageView = {
  days: DAY.map((day, i) => ({ day: at(`${day} 00:00`), cost: COST[i] ?? 0, boxes: BOXES[i] ?? 0 })),
  managers: [
    { id: "root", name: "Juno", cost: 14 },
    { id: "coding", name: "Coding", cost: 148 },
    { id: "docs", name: "Docs", cost: 12 },
    { id: "releases", name: "Releases", cost: 9 },
    { id: "support", name: "Support", cost: 96 },
    { id: "whatsapp", name: "WhatsApp desk", cost: 38 },
    { id: "sales", name: "Sales", cost: 52 },
  ],
  models: [
    { model: "claude-sonnet-5-5", cost: 238, notKnown: 0 },
    { model: "claude-haiku-5-5", cost: 71, notKnown: 0 },
    { model: "claude-opus-5-5", cost: 60, notKnown: 0 },
  ],
  perDay: 100,
  tellAt: 80,
};

export const BILLING: BillingView = {
  plan: "Team",
  people: 3,
  perPerson: 20,
  boxHours: { used: 318, included: 500, overPerHour: 0.08 },
  nextInvoice: at("1 Dec 00:00"),
  notCounted: ["Ngozi Eze"],
  invoices: [
    { id: "i3", at: at("1 Nov 00:00"), amount: 60, paid: true, period: { from: at("1 Oct 00:00"), to: at("31 Oct 23:59") }, people: 3 },
    { id: "i2", at: at("1 Oct 00:00"), amount: 60, paid: true, period: { from: at("1 Sep 00:00"), to: at("30 Sep 23:59") }, people: 3 },
    { id: "i1", at: at("14 Sep 00:00"), amount: 40, paid: true, period: { from: at("14 Sep 00:00"), to: at("30 Sep 23:59") }, people: 2 },
  ],
};

export const MONEY_PAGES: readonly Fixture[] = [
  read("/settings/keys", {}, KEYS),
  read("/settings/usage", {}, USAGE),
  read("/settings/billing", {}, BILLING),
];
