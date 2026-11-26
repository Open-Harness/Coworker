import type { Store } from "../types.ts";

/** A setting of the workspace, or what it is when none was ever set. */
export async function settingOr<T extends string | number | boolean>(store: Store, name: string, fallback: T): Promise<T> {
  const value = await store.setting(name);
  return typeof value === typeof fallback ? (value as T) : fallback;
}
