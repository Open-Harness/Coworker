import { compile } from "@earendil-works/pi-schema";
import { AGENT_SETTINGS, type AgentConfig, type AgentSetting, BLANK_AGENT } from "../types.ts";

export const SETTINGS = Object.keys(AGENT_SETTINGS) as readonly AgentSetting[];

const validators = new Map<string, { readonly check: (value: unknown) => boolean }>(
  SETTINGS.map((key) => [key, compile(AGENT_SETTINGS[key])]),
);

export const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const allows = (key: AgentSetting, value: unknown): boolean => validators.get(key)?.check(value) === true;

/** What a person is told about a setting that is wrong. */
export const refusal = (key: AgentSetting): string => `${key} must be ${String(AGENT_SETTINGS[key]["description"])}`;

/** The value as saved; of a list, the items still allowed; else the blank. */
export function readable(key: AgentSetting, value: unknown): unknown {
  if (allows(key, value)) return value;
  return Array.isArray(value) ? value.filter((item) => allows(key, [item])) : BLANK_AGENT[key];
}

/** Every setting, in the schema's order, from `pick`. */
export const configFrom = (pick: (key: AgentSetting) => unknown): AgentConfig =>
  Object.fromEntries(SETTINGS.map((key) => [key, pick(key)])) as unknown as AgentConfig;

/** A value as one comparable string, whatever order its keys were written in. */
export const canon = (value: unknown): string =>
  JSON.stringify(value, (_key, inner: unknown) => (isRecord(inner) ? Object.entries(inner).sort(([a], [b]) => (a < b ? -1 : 1)) : inner));
