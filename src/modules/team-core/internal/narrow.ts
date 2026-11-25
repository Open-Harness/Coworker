import type { Json } from "../types.ts";

export const isRecord = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);
export const arrayOf = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);
export const textOf = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);
export const numberOf = (value: unknown, fallback = 0): number => (typeof value === "number" && Number.isFinite(value) ? value : fallback);
/** Text with something in it. */
export const wordsOf = (value: unknown): string | undefined => (typeof value === "string" && value.trim() !== "" ? value : undefined);

/** Every record of a list that `decode` understands. */
export const each = <T>(value: unknown, decode: (record: Json) => T | undefined): readonly T[] =>
  arrayOf(value).flatMap((entry) => {
    const decoded = isRecord(entry) ? decode(entry) : undefined;
    return decoded === undefined ? [] : [decoded];
  });
