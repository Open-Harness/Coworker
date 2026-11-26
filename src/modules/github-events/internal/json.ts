import type { Who } from "../records.ts";

/* Narrowing of what GitHub sends: everything is `unknown` until it is looked at here. Nothing throws. */

export type Json = Readonly<Record<string, unknown>>;

export const isJson = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);
export const obj = (value: unknown, key: string): Json | undefined => {
  const found = isJson(value) ? value[key] : undefined;
  return isJson(found) ? found : undefined;
};
export const str = (value: unknown, key: string): string | undefined => {
  const found = isJson(value) ? value[key] : undefined;
  return typeof found === "string" ? found : undefined;
};
export const num = (value: unknown, key: string): number | undefined => {
  const found = isJson(value) ? value[key] : undefined;
  return typeof found === "number" && Number.isFinite(found) ? found : undefined;
};
export const bool = (value: unknown, key: string): boolean | undefined => {
  const found = isJson(value) ? value[key] : undefined;
  return typeof found === "boolean" ? found : undefined;
};
export const list = (value: unknown, key: string): readonly Json[] => {
  const found = isJson(value) ? value[key] : undefined;
  return Array.isArray(found) ? found.filter(isJson) : [];
};

/** GitHub's time: an ISO string, or whole seconds. Milliseconds out; `undefined` when it is neither. */
export function timeOf(value: unknown): number | undefined {
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return typeof value === "number" && Number.isFinite(value) ? value * 1000 : undefined;
}
export const timeAt = (value: unknown, ...keys: readonly string[]): number | undefined => {
  for (const key of keys) {
    const found = isJson(value) ? timeOf(value[key]) : undefined;
    if (found !== undefined) return found;
  }
  return undefined;
};

export function whoOf(value: unknown): Who | undefined {
  const login = str(value, "login");
  const id = num(value, "id");
  if (login === undefined || id === undefined) return undefined;
  return { login, id, bot: str(value, "type") === "Bot" || login.endsWith("[bot]") };
}
export const nobody: Who = { login: "ghost", id: 0, bot: false };
export const whoAt = (value: unknown, key: string): Who => whoOf(obj(value, key)) ?? nobody;

export const names = (value: unknown, key: string, field: string): readonly string[] =>
  list(value, key).flatMap((one) => {
    const found = str(one, field);
    return found === undefined ? [] : [found];
  });
