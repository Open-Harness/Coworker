import { useCallback, useState } from "react";
import type { Loaded } from "~/modules/team-core/types.ts";

/** What a save is doing, for the line beside its button. */
export type SaveState =
  | { readonly _tag: "idle" }
  | { readonly _tag: "saving" }
  | { readonly _tag: "saved" }
  | { readonly _tag: "failed"; readonly message: string };

export interface Saver {
  readonly state: SaveState;
  /** Runs one save; gives what the server answered, or nothing when it failed (the state says why). */
  readonly run: <T>(asking: () => Promise<Loaded<T>>) => Promise<T | undefined>;
  readonly reset: () => void;
}

export function useSave(): Saver {
  const [state, setState] = useState<SaveState>({ _tag: "idle" });
  const run = useCallback(async <T>(asking: () => Promise<Loaded<T>>): Promise<T | undefined> => {
    setState({ _tag: "saving" });
    const result = await asking();
    setState(result._tag === "Failed" ? { _tag: "failed", message: result.message } : { _tag: "saved" });
    return result._tag === "Loaded" ? result.value : undefined;
  }, []);
  const reset = useCallback(() => setState({ _tag: "idle" }), []);
  return { state, run, reset };
}
