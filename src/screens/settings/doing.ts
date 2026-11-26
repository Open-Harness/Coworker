import { useCallback } from "react";
import { useToast } from "@astryxdesign/core/Toast";
import { useApi, useBrowser, useRefresh } from "~/modules/page/service.ts";
import type { Did, Values } from "~/modules/api/types.ts";

/** What pressing a doing came to: what it did, or null when the console did not answer. */
export type Pressed = (doing: string, values: Values, reads?: readonly string[]) => Promise<Did | null>;

/** Presses one doing of the registry, says what became of it in a toast, and reads again what it may have changed. */
export function useDoing(): Pressed {
  const [api, refresh, { newId }, toast] = [useApi(), useRefresh(), useBrowser(), useToast()];
  return useCallback(
    async (doing, values, reads = []) => {
      const made = await api.write("/do", { doing, values, key: newId() });
      if (made._tag !== "Ok") {
        toast({ body: made.says, uniqueID: `${doing}-failed` });
        return null;
      }
      const did = made.value;
      const body =
        did._tag === "Done"
          ? did.says
          : did._tag === "Refused"
            ? did.why
            : did._tag === "Asked"
              ? "It waits for a yes in your inbox"
              : "It did not go through";
      toast({ body, uniqueID: doing });
      if (did._tag === "Done" || did._tag === "Asked") refresh([...reads, "/shell"]);
      return did;
    },
    [api, refresh, newId, toast],
  );
}
