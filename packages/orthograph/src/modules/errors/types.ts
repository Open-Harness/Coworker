// Errors: refusals that depend on data. Named by the exported class, `class AllowanceExceeded extends Blueprint.error(...) {}`.
import { Data, type Cause, type Schema } from "effect";
import type { FieldsInput, ValueOf } from "#modules/things/types.js";

export type ErrorFields<F extends FieldsInput> = { readonly [K in keyof F]: ValueOf<F[K]>["schema"]["Type"] };

/** Every declared error. `_tag` is a string here; generated code narrows it to the class's export name. */
export interface BlueprintError {
  readonly _tag: string;
}

export interface ErrorClass<F extends FieldsInput = FieldsInput> {
  new (args: ErrorFields<F>): Cause.YieldableError & BlueprintError & ErrorFields<F>;
  readonly fields: F;
  readonly schema: Schema.Struct<{ readonly [K in keyof F]: ValueOf<F[K]>["schema"] }>;
  /** The exit code the CLI ends with on this refusal. */
  readonly exit: number;
  /** Its place among the errors made so far: within one `errors.ts`, the order they are declared in. */
  readonly sequence: number;
}

/** Any declared error class. `args: any` because constructor parameters are contravariant. */
export interface AnyErrorClass {
  new (args: any): Cause.YieldableError & BlueprintError;
  readonly fields: FieldsInput;
  readonly schema: Schema.Top;
  readonly exit: number;
  readonly sequence: number;
}

export interface ErrorsApi {
  readonly error: <const F extends FieldsInput>(fields: F, options: { readonly exit: number }) => ErrorClass<F>;
}

/** Called only by generated code and by the runtime's own refusals: gives a class its name. */
export interface Naming {
  readonly name: (cls: AnyErrorClass, name: string) => void;
  readonly nameOf: (cls: AnyErrorClass) => string | undefined;
}

/** The runtime's own refusal: the caller has none of the operation's roles, so the handler never runs. Exit 3. */
export class NotAllowed extends Data.TaggedError("NotAllowed")<{}> {}
