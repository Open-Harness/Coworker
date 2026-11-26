/*
 * Webhook bodies are `unknown` until narrowed here. Only the fields a Trigger needs are read; anything missing
 * makes the event unreadable rather than half-read.
 */

export type Json = Readonly<Record<string, unknown>>;

export const isRecord = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);
export const recordAt = (value: Json, key: string): Json | undefined => (isRecord(value[key]) ? value[key] : undefined);
export const textAt = (value: Json | undefined, key: string): string | undefined =>
  typeof value?.[key] === "string" ? value[key] : undefined;
export const numberAt = (value: Json | undefined, key: string): number | undefined =>
  typeof value?.[key] === "number" ? value[key] : undefined;
export const listAt = (value: Json | undefined, key: string): readonly Json[] =>
  Array.isArray(value?.[key]) ? (value[key] as readonly unknown[]).filter(isRecord) : [];

export const parse = (body: string): Json | undefined => {
  try {
    const value: unknown = JSON.parse(body);
    return isRecord(value) ? value : undefined;
  } catch {
    return undefined;
  }
};

/** Who sent the event: GitHub's own numeric id, never the login, is the handle. */
export interface Sender {
  readonly id: string;
  readonly login: string;
  readonly human: boolean;
}

export function senderOf(payload: Json): Sender | undefined {
  const sender = recordAt(payload, "sender");
  const id = numberAt(sender, "id");
  const login = textAt(sender, "login");
  return id === undefined || login === undefined ? undefined : { id: String(id), login, human: textAt(sender, "type") === "User" };
}
