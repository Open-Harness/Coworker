import { useCallback, useEffect, useMemo, useState } from "react";
import type { Loaded, Loading } from "../types.ts";

/**
 * Loads when a screen opens, and again every `everyMs` while it is open. `load` must stay the same function until what
 * it loads changes (`useCallback`): a new one starts over with nothing shown.
 */
export function useLoading<T>(load: () => Promise<Loaded<T>>, everyMs?: number): Loading<T> {
  const [state, setState] = useState<{ readonly from: () => Promise<Loaded<T>>; readonly loaded: Loaded<T> }>();
  const [asked, setAsked] = useState(0);
  useEffect(() => {
    let isCurrent = true;
    const refresh = () =>
      void load().then((loaded) => {
        if (isCurrent) setState({ from: load, loaded });
      });
    refresh();
    const timer = everyMs === undefined ? undefined : setInterval(refresh, everyMs);
    return () => {
      isCurrent = false;
      clearInterval(timer);
    };
  }, [load, everyMs, asked]);
  const reload = useCallback(() => setAsked((count) => count + 1), []);
  const show = useCallback((value: T) => setState({ from: load, loaded: { _tag: "Loaded", value } }), [load]);
  const current = state?.from === load ? state.loaded : undefined;
  const loaded = useMemo(() => (current?._tag === "Failed" ? { ...current, retry: reload } : current), [current, reload]);
  return { loaded, reload, show };
}
