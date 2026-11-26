import type { Store, Values } from "./types.ts";

export interface FakeStore extends Store {
  readonly values: Record<string, string>;
}

/** A store in memory. */
export function fakeStore(had: Values = {}): FakeStore {
  const values: Record<string, string> = { ...had };
  return {
    values,
    read: async () => ({ ...values }),
    write: async (more) => {
      Object.assign(values, more);
      return { _tag: "Written", names: Object.keys(more) };
    },
  };
}
