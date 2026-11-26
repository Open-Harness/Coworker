/* What the workspace has connected: models and the secrets behind them. Money here adds up to the week in world.ts (369 dollars). */

export type Thinking = "Off" | "Low" | "Medium" | "High";
export interface Model { readonly id: string; readonly name: string; readonly in: number; readonly out: number; readonly thinking: readonly Thinking[]; /** Dollars in the last 7 days, over all managers. */ readonly week: number }
export interface Provider { readonly id: string; readonly name: string; readonly key: string; readonly works: boolean; readonly checked: string; readonly models: readonly Model[] }

export const PROVIDERS: readonly Provider[] = [
  { id: "anthropic", name: "Anthropic", key: "ANTHROPIC_KEY", works: true, checked: "09:50", models: [
    { id: "sonnet", name: "Claude Sonnet 5.5", in: 3, out: 15, thinking: ["Off", "Low", "Medium", "High"], week: 238 },
    { id: "haiku", name: "Claude Haiku 5.5", in: 1, out: 5, thinking: ["Off", "Low"], week: 71 },
    { id: "opus", name: "Claude Opus 5.5", in: 15, out: 75, thinking: ["Low", "Medium", "High"], week: 60 },
  ] },
];
export const MODELS: readonly Model[] = PROVIDERS.flatMap((p) => [...p.models]);
export const THINKING: readonly Thinking[] = ["Off", "Low", "Medium", "High"];
/** The workspace's own choice. A manager, then an agent, may choose another. */
export const DEFAULT_MODEL = { model: "sonnet", thinking: "Medium" } as const;
export const price = (n: number) => `$${n}`;

/** A secret is shown by name only. `by`: who uses it. */
export interface Secret { readonly id: string; readonly name: string; readonly of: string; readonly by: readonly string[]; readonly used: string }
export const SECRETS: readonly Secret[] = [
  { id: "s1", name: "ANTHROPIC_KEY", of: "Models", by: ["Every manager"], used: "Today, 09:54" },
  { id: "s2", name: "GITHUB_APP_KEY", of: "GitHub", by: ["Coding", "Docs", "Releases"], used: "Today, 09:54" },
  { id: "s3", name: "SLACK_BOT_TOKEN", of: "Slack", by: ["Coding", "Sales", "Juno"], used: "Today, 09:05" },
  { id: "s4", name: "MAIL_PASSWORD", of: "Email", by: ["Support", "Sales", "Releases"], used: "Today, 09:31" },
  { id: "s5", name: "WHATSAPP_SESSION_KEY", of: "WhatsApp", by: ["WhatsApp desk"], used: "Today, 08:10" },
  { id: "s6", name: "CRM_API_KEY", of: "CRM", by: ["Sales"], used: "Today, 09:20" },
  { id: "s7", name: "SENTRY_TOKEN", of: "Sentry (MCP server)", by: ["Coding"], used: "24 Nov" },
  { id: "s8", name: "CUSTOMER_DB_URL", of: "Customer database (MCP server)", by: ["Support"], used: "Today, 09:31" },
];
