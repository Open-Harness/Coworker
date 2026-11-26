import type { Problem } from "../types.ts";

/*
 * Small checkers for data that came from outside as `unknown`. Each says what is wrong, in words, with the file and the thing it
 * is in, and goes on, so that every problem of a file is said at once. A checker returns the value it made, or BAD.
 */

export const BAD: unique symbol = Symbol("bad");
export type Bad = typeof BAD;

export interface Where {
  readonly sink: Problem[];
  readonly at: string;
  readonly line: string | undefined;
  readonly trail: readonly (string | number)[];
}
export type Sch<T> = (value: unknown, where: Where) => T | Bad;

export interface Req<T> {
  readonly sch: Sch<T>;
  readonly optional: false;
}
export interface Opt<T> {
  readonly sch: Sch<T>;
  readonly optional: true;
}
export type Shape = Readonly<Record<string, Req<unknown> | Opt<unknown>>>;
type OptKeys<S> = { [K in keyof S]: S[K] extends Opt<unknown> ? K : never }[keyof S];
type ReqKeys<S> = { [K in keyof S]: S[K] extends Opt<unknown> ? never : K }[keyof S];
type ValueOf<F> = F extends Req<infer T> ? T : F extends Opt<infer T> ? T : never;
export type Out<S extends Shape> = { readonly [K in ReqKeys<S>]: ValueOf<S[K]> } & { readonly [K in OptKeys<S>]?: ValueOf<S[K]> };

export const req = <T>(sch: Sch<T>): Req<T> => ({ sch, optional: false });
export const opt = <T>(sch: Sch<T>): Opt<T> => ({ sch, optional: true });

export function rootWhere(sink: Problem[], at: string, line?: string): Where {
  return { sink, at, line, trail: [] };
}
export const child = (w: Where, key: string | number): Where => ({ ...w, trail: [...w.trail, key] });

const pathOf = (w: Where): string => w.trail.map((t, i) => (typeof t === "number" ? `[${t + 1}]` : i === 0 ? t : `.${t}`)).join("");

/** A problem with exactly these words. */
export function say(w: Where, says: string): Bad {
  w.sink.push(w.line === undefined ? { at: w.at, says } : { at: w.at, line: w.line, says });
  return BAD;
}
/** A problem about the value at `w`: its place, then what is wrong. */
export function fail(w: Where, what: string): Bad {
  const path = pathOf(w);
  return say(w, path === "" ? `This ${what}.` : `${path} ${what}.`);
}

/** Look at one thing of the file in a line of its own, named by what is in it. */
export function lined<T>(name: (value: unknown, w: Where) => string | undefined, sch: Sch<T>): Sch<T> {
  return (value, w) => sch(value, { ...w, line: name(value, w) ?? w.line });
}

export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export const idOf = (value: unknown): string | undefined => (isRecord(value) && typeof value["id"] === "string" ? value["id"] : undefined);

const shown = (value: unknown): string => {
  if (typeof value === "string") return `"${value.length > 40 ? `${value.slice(0, 40)}...` : value}"`;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return value === null ? "nothing" : Array.isArray(value) ? "a list" : typeof value === "object" ? "a mapping" : "something else";
};

export const str: Sch<string> = (value, w) => (typeof value === "string" ? value : fail(w, `must be text, not ${shown(value)}`));
export const num: Sch<number> = (value, w) =>
  typeof value === "number" && Number.isFinite(value) ? value : fail(w, `must be a number, not ${shown(value)}`);
export const bool: Sch<boolean> = (value, w) =>
  typeof value === "boolean" ? value : fail(w, `must be true or false, not ${shown(value)}`);
export const yes: Sch<true> = (value, w) => (value === true ? true : fail(w, `must be true, not ${shown(value)}`));

export function lit<const T extends string>(...allowed: readonly T[]): Sch<T> {
  return (value, w) => {
    const found = allowed.find((a) => a === value);
    return found !== undefined ? found : fail(w, `must be one of ${allowed.join(", ")}, not ${shown(value)}`);
  };
}

export function arr<T>(item: Sch<T>): Sch<readonly T[]> {
  return (value, w) => {
    if (!Array.isArray(value)) return fail(w, `must be a list, not ${shown(value)}`);
    const out: T[] = [];
    let bad = false;
    for (const [i, one] of value.entries()) {
      const made = item(one, child(w, i));
      if (made === BAD) bad = true;
      else out.push(made);
    }
    return bad ? BAD : out;
  };
}

/** A mapping of any keys to one kind of value. */
export function rec<T>(item: Sch<T>): Sch<Readonly<Record<string, T>>> {
  return (value, w) => {
    if (!isRecord(value)) return fail(w, `must be a mapping, not ${shown(value)}`);
    const out: [string, T][] = [];
    let bad = false;
    for (const [key, one] of Object.entries(value)) {
      const made = item(one, child(w, key));
      if (made === BAD) bad = true;
      else out.push([key, made]);
    }
    return bad ? BAD : Object.fromEntries(out);
  };
}

/** A mapping with these keys and no others. */
export function obj<S extends Shape>(label: string, shape: S): Sch<Out<S>> {
  return (value, w) => {
    if (!isRecord(value)) return fail(w, `must be a mapping of ${label}, not ${shown(value)}`);
    const out: [string, unknown][] = [];
    let bad = false;
    for (const [key, field] of Object.entries(shape)) {
      if (!Object.hasOwn(value, key)) {
        if (!field.optional) bad = say(child(w, key), `${pathOf(child(w, key))} is missing from ${label}.`) === BAD || bad;
        continue;
      }
      const made = field.sch(value[key], child(w, key));
      if (made === BAD) bad = true;
      else out.push([key, made]);
    }
    for (const key of Object.keys(value))
      if (!Object.hasOwn(shape, key)) bad = say(w, `${pathOf(child(w, key))} is not a key that ${label} has.`) === BAD || bad;
    return bad ? BAD : (Object.fromEntries(out) as Out<S>);
  };
}

type Made<M> = M extends Sch<infer T> ? T : never;
/** A mapping of one key, and that key says which. */
export function exactlyOne<const M extends Readonly<Record<string, Sch<unknown>>>>(
  label: string,
  alternatives: M,
): Sch<{ readonly [K in keyof M & string]: { readonly [P in K]: Made<M[K]> } }[keyof M & string]> {
  type Result = { readonly [K in keyof M & string]: { readonly [P in K]: Made<M[K]> } }[keyof M & string];
  return (value, w) => {
    const names = Object.keys(alternatives).join(", ");
    if (!isRecord(value)) return fail(w, `must be a mapping with one of ${names}, not ${shown(value)}`);
    const keys = Object.keys(value);
    const [only] = keys;
    if (keys.length !== 1 || only === undefined || !Object.hasOwn(alternatives, only))
      return fail(w, `must say ${label} with exactly one of ${names}`);
    const sch = alternatives[only];
    const made = sch === undefined ? BAD : sch(value[only], child(w, only));
    return made === BAD ? BAD : (Object.fromEntries([[only, made]]) as Result);
  };
}

/** One of several shapes, chosen by `choose`; when it cannot, `expected` says what was wanted. */
export function dispatch<T>(choose: (value: unknown) => Sch<T> | undefined, expected: string): Sch<T> {
  return (value, w) => {
    const sch = choose(value);
    return sch === undefined ? fail(w, `must be ${expected}, not ${shown(value)}`) : sch(value, w);
  };
}

/** A mapping whose field `tag` picks the shape. */
export function byTag<T>(tag: string, shapes: Readonly<Record<string, Sch<T>>>): Sch<T> {
  return (value, w) => {
    const which = isRecord(value) ? value[tag] : undefined;
    const sch = typeof which === "string" && Object.hasOwn(shapes, which) ? shapes[which] : undefined;
    if (sch !== undefined) return sch(value, w);
    return fail(child(w, tag), `must be one of ${Object.keys(shapes).join(", ")}, not ${shown(which)}`);
  };
}
