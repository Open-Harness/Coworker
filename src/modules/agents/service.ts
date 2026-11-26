import { allows, canon, configFrom, isRecord, readable, refusal, SETTINGS } from "./internal/settings.ts";
import { BLANK_AGENT, type CheckAgentConfig, type ReadAgentConfig, type SameAgentConfig } from "./types.ts";

export const checkAgentConfig: CheckAgentConfig = (sent) => {
  if (!isRecord(sent)) return { ok: false, reason: "Send config, an object" };
  const unknown = Object.keys(sent).find((key) => !SETTINGS.some((setting) => setting === key));
  if (unknown !== undefined)
    return { ok: false, reason: `${unknown} is not a setting of an agent. The settings are ${SETTINGS.join(", ")}` };
  const value = configFrom((key) => (key === "name" && typeof sent.name === "string" ? sent.name.trim() : (sent[key] ?? BLANK_AGENT[key])));
  const wrong = SETTINGS.find((key) => !allows(key, value[key]));
  return wrong === undefined ? { ok: true, value } : { ok: false, reason: refusal(wrong) };
};

export const readAgentConfig: ReadAgentConfig = (stored) => {
  const saved = isRecord(stored) ? stored : {};
  return configFrom((key) => readable(key, saved[key]));
};

export const sameAgentConfig: SameAgentConfig = (one, other) => SETTINGS.every((key) => canon(one[key]) === canon(other[key]));
