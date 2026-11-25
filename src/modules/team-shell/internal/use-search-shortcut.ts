import { useEffect } from "react";
import type { KeyListener } from "~/modules/team-core/types.ts";

/** Command-K or Control-K opens search, wherever the focus is in the app. */
export function useSearchShortcut(listen: KeyListener | undefined, open: () => void): void {
  useEffect(
    () =>
      listen?.((event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
          event.preventDefault();
          open();
        }
      }),
    [listen, open],
  );
}
