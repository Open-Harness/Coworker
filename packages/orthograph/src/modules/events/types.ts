// Events: what a move emits. An event is named by its export, `export const AllowanceGranted = Blueprint.event({...})`.
import type { Schema } from "effect";
import type { FieldsInput, ValueOf } from "#modules/things/types.js";

export interface Event<F extends FieldsInput = FieldsInput> {
  readonly kind: "event";
  readonly fields: F;
  readonly schema: Schema.Struct<{ readonly [K in keyof F]: ValueOf<F[K]>["schema"] }>;
}

export interface EventsApi {
  readonly event: <const F extends FieldsInput>(fields: F) => Event<F>;
}

/** Called only by generated code and the compiler: gives an event the name of its export. */
export interface EventNaming {
  readonly name: (event: Event, name: string) => void;
  readonly nameOf: (event: Event) => string | undefined;
}
