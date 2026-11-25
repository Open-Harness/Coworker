import { defineEntry, UserEntry } from "@earendil-works/pi-durable";
import type { Author, IsInput } from "../types.ts";

export const AuthoredEntry = defineEntry<{ author: { id: string; name: string } }>("app.user");
export const ScheduledEntry = defineEntry<{ scheduleId: string; instruction: string }>("app.scheduled");

export const isInput: IsInput = (entry) => UserEntry.is(entry) || AuthoredEntry.is(entry) || ScheduledEntry.is(entry);

/** What the model reads for a prompt. The name is normalized, so it cannot contain brackets or a line break. */
export const attributedText = (author: Author, text: string): string => `[${author.name}]\n${text}`;

const attribution = /^\[([^\]\n]*)\]\n/u;

export const withoutAttribution = (text: string): string => text.replace(attribution, "");

export function authorOf(entry: { readonly kind: string; readonly data?: unknown }, text: string): Author {
  const { data } = entry;
  if (entry.kind === AuthoredEntry.kind && isRecord(data) && isRecord(data.author)) {
    const { id, name } = data.author;
    if (typeof id === "string" && typeof name === "string") return { id, name };
  }
  return { id: "", name: attribution.exec(text)?.[1] ?? "Someone" };
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
