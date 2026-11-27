// Refs are proxies: any property read on one is a longer ref, so `s.last.allowance` needs no declared shape.
import type { Ref } from "../types.ts";

const PATH = Symbol.for("ortho/ref-path");

export const refTo = (path: ReadonlyArray<string>): any =>
  new Proxy(Object.freeze({ [PATH]: path }), {
    get: (target, key) => {
      if (key === PATH) return target[PATH];
      // Not a thenable, not a primitive: awaiting or printing a ref must not grow it.
      if (typeof key === "symbol" || key === "then" || key === "toJSON") return undefined;
      return refTo([...path, key]);
    },
  });

export const isRef = (x: unknown): x is Ref =>
  typeof x === "object" && x !== null && Array.isArray((x as Record<symbol, unknown>)[PATH]);

export const pathOf = (ref: Ref): ReadonlyArray<string> => (ref as unknown as Record<symbol, ReadonlyArray<string>>)[PATH] ?? [];

/** Replaces every ref in `value`; a path the world never gave is listed in `missing`, never thrown. */
export const resolve = (value: unknown, env: { readonly [root: string]: unknown }): { readonly value: unknown; readonly missing: ReadonlyArray<string> } => {
  const missing: Array<string> = [];
  const walk = (v: unknown): unknown => {
    if (isRef(v)) {
      const path = pathOf(v);
      let at: unknown = env;
      for (const key of path) {
        if (typeof at !== "object" || at === null || !(key in at)) {
          missing.push(path.join("."));
          return undefined;
        }
        at = (at as Record<string, unknown>)[key];
      }
      return at;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (typeof v === "object" && v !== null && Object.getPrototypeOf(v) === Object.prototype) {
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    }
    return v;
  };
  const out = walk(value);
  return { value: out, missing };
};
