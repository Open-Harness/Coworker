import type { Blank, BlanksApi } from "./types.ts";

export const Blanks: BlanksApi = {
  todo: <T>(what: string) => Object.freeze({ kind: "blank", what } satisfies Blank) as T,
  isBlank: (x): x is Blank => typeof x === "object" && x !== null && (x as { kind?: unknown }).kind === "blank",
};
