import type { BillingData, HandleData, ModelSource, Role } from "../types.ts";

export const ROLES: readonly { readonly value: Role; readonly label: string; readonly description: string }[] = [
  { value: "owner", label: "Owner", description: "Everything, with settings and billing" },
  { value: "builder", label: "Builder", description: "Makes managers and environments" },
  { value: "member", label: "Member", description: "Works with managers" },
];
export const roleLabel = (role: Role): string => ROLES.find(({ value }) => value === role)?.label ?? role;
export const isRole = (value: string | null): value is Role => ROLES.some((role) => role.value === value);

export const SOURCE: Readonly<Record<ModelSource, { readonly label: string; readonly how: string }>> = {
  anthropic: { label: "Anthropic", how: "API key" },
  openai: { label: "OpenAI", how: "API key" },
  google: { label: "Google", how: "API key" },
  opencode: { label: "OpenCode", how: "API key" },
  endpoint: { label: "Your own endpoint", how: "OpenAI-compatible" },
  chatgpt: { label: "ChatGPT", how: "Sign-in" },
};

/** Milliseconds, as `Timestamp` wants them. */
export const seconds = (at: number): number => Math.floor(at / 1000);
export const dollars = (cents: number): string => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
export const hours = (value: number): string => `${Number(value.toFixed(1))} h`;
export const day = (at: number): string =>
  new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** One model of one connection, as a single option value. */
export const modelKey = ({ connectionId, model }: { readonly connectionId: string; readonly model: string }): string =>
  `${connectionId}\u0000${model}`;

/** Every time zone the browser knows, with `current` first when it is not among them. */
export function timeZones(current?: string): readonly { readonly value: string; readonly label: string }[] {
  const known = Intl.supportedValuesOf("timeZone");
  const names = current === undefined || current === "" || known.includes(current) ? known : [current, ...known];
  return names.map((name) => ({ value: name, label: name.replaceAll("_", " ") }));
}

/** Seats now, and the hours past the plan so far. */
export const soFar = (billing: BillingData): number => billing.seats * billing.seatCents + billing.overageCents;

export const HANDLE_KIND: Readonly<Record<string, string>> = { email: "Email", github: "GitHub", slack: "Slack" };
export const HANDLE_PROOF: Readonly<Record<string, string>> = {
  signed_in: "Signed in",
  verified: "Verified",
  added: "Added by an Owner",
};
export const handleName = ({ kind, id, display }: HandleData): string => (kind === "email" ? id : (display ?? id));
