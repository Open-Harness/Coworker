import { useCallback } from "react";
import { useToast } from "@astryxdesign/core/Toast";
import type { Loaded } from "~/modules/team-core/types.ts";

/** Runs a save, says how it went, and gives whether it worked. */
export function useAct(): <T>(asking: Promise<Loaded<T>>, saved: string, then?: (value: T) => void) => Promise<boolean> {
  const showToast = useToast();
  return useCallback(
    async (asking, saved, then) => {
      const result = await asking;
      if (result._tag === "Failed") {
        showToast({ body: result.message, type: "error" });
        return false;
      }
      showToast({ body: saved });
      then?.(result.value);
      return true;
    },
    [showToast],
  );
}
