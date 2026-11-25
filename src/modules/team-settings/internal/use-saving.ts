import { useCallback, useState } from "react";
import type { Loaded } from "~/modules/team-core/types.ts";

/** Where a save is: not started, on its way, done, or refused in the server's words. */
export type Saving = { readonly state: "idle" | "saving" | "saved" } | { readonly state: "failed"; readonly message: string };

export interface Saver {
  readonly status: Saving;
  /** Runs one save and says how it went. Gives the value when it worked. */
  readonly run: <T>(asking: Promise<Loaded<T>>) => Promise<{ readonly value: T } | undefined>;
  readonly clear: () => void;
}

export function useSaving(): Saver {
  const [status, setStatus] = useState<Saving>({ state: "idle" });
  const run: Saver["run"] = useCallback(async (asking) => {
    setStatus({ state: "saving" });
    const result = await asking;
    if (result._tag === "Failed") {
      setStatus({ state: "failed", message: result.message });
      return undefined;
    }
    setStatus({ state: "saved" });
    return { value: result.value };
  }, []);
  const clear = useCallback(() => setStatus({ state: "idle" }), []);
  return { status, run, clear };
}
