import { createApi } from "~/modules/api/service.ts";
import type { Reads } from "~/modules/api/types.ts";
import type { Params, Read } from "../types.ts";

interface Entry {
  state: Read<unknown>;
  readonly listeners: Set<() => void>;
  readonly path: keyof Reads;
  readonly parts: Params | undefined;
  readonly workspace: string;
  asking: boolean;
}

export interface Reads_ {
  readonly peek: (workspace: string, path: keyof Reads, parts?: Params) => Read<unknown>;
  readonly watch: (workspace: string, path: keyof Reads, parts: Params | undefined, listener: () => void) => () => void;
  /** Ask again, and keep what was read until the answer comes. `only`: the paths, filled in, that changed (`/m/ab12/board`). */
  readonly refresh: (workspace: string, only?: readonly string[]) => void;
}

const LOADING: Read<unknown> = { _tag: "Loading" };

/** What the page has read from the console, by address, and who is watching it. A read is asked once however many screens use it. */
export function createReads(send: typeof fetch): Reads_ {
  const entries = new Map<string, Entry>();
  const apis = new Map<string, ReturnType<typeof createApi>>();
  const api = (workspace: string) => {
    const known = apis.get(workspace) ?? createApi({ fetch: send, workspace });
    apis.set(workspace, known);
    return known;
  };
  const keyOf = (workspace: string, path: keyof Reads, parts?: Params): string => api(workspace).url(workspace, path, parts);

  async function ask(entry: Entry): Promise<void> {
    if (entry.asking) return;
    entry.asking = true;
    const answer = await api(entry.workspace).read(entry.path, entry.parts);
    entry.asking = false;
    entry.state =
      answer._tag === "Ok"
        ? { _tag: "Ok", value: answer.value }
        : answer.status === 404
          ? { _tag: "Gone" }
          : { _tag: "Failed", says: answer.says, status: answer.status };
    for (const listener of entry.listeners) listener();
  }

  function entryOf(workspace: string, path: keyof Reads, parts?: Params): Entry {
    const key = keyOf(workspace, path, parts);
    const known = entries.get(key);
    if (known !== undefined) return known;
    const made: Entry = { state: LOADING, listeners: new Set(), path, parts, workspace, asking: false };
    entries.set(key, made);
    void ask(made);
    return made;
  }

  return {
    peek: (workspace, path, parts) => entries.get(keyOf(workspace, path, parts))?.state ?? LOADING,
    watch(workspace, path, parts, listener) {
      const entry = entryOf(workspace, path, parts);
      entry.listeners.add(listener);
      // A failed read is asked again when a screen comes back to it.
      if (entry.state._tag === "Failed" || entry.state._tag === "Gone") void ask(entry);
      return () => void entry.listeners.delete(listener);
    },
    refresh(workspace, only) {
      const prefix = `/api/ws/${encodeURIComponent(workspace)}`;
      for (const [key, entry] of entries) {
        if (entry.workspace !== workspace) continue;
        const own = key.slice(prefix.length);
        if (only === undefined || only.some((path) => own === path || own.startsWith(`${path}?`))) void ask(entry);
      }
    },
  };
}
