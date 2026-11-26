import { Schema } from "effect";
import type { Value } from "#modules/values/types.js";
import type { FieldInput, FieldsInput, ValueOf } from "../types.ts";

export const valueOf = (input: FieldInput): Value => (input.kind === "field" ? input.value : input);

/** The struct schema for a set of declared fields: a payload, an answer, an event or an error. */
export const structOf = <F extends FieldsInput>(fields: F) =>
  Schema.Struct(Object.fromEntries(Object.entries(fields).map(([k, f]) => [k, valueOf(f).schema]))) as unknown as Schema.Struct<{
    readonly [K in keyof F]: ValueOf<F[K]>["schema"];
  }>;
