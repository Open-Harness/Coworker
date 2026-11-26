import { useMemo, type ComponentType } from "react";
import { PageProvider, Screens } from "~/modules/page/service.ts";
import type { Browser, PageProps, ScreenRoute } from "~/modules/page/types.ts";
import { Shell } from "./shell.tsx";

/* The console in the browser: the one place that reaches for its globals. Screens are found by their folders. */
const routes = import.meta.glob<ScreenRoute | readonly ScreenRoute[]>("./screens/*/route.ts", { eager: true, import: "default" });
const pages = import.meta.glob<{ readonly default: ComponentType<PageProps> }>("./screens/*/index.tsx");

function browser(): Browser {
  return {
    fetch: (input, init) => window.fetch(input, init),
    now: () => Date.now(),
    newId: () => window.crypto.randomUUID(),
    open: (url) => window.location.assign(url),
    reload: () => window.location.reload(),
    online: {
      now: () => window.navigator.onLine,
      subscribe: (listener) => {
        window.addEventListener("online", listener);
        window.addEventListener("offline", listener);
        return () => {
          window.removeEventListener("online", listener);
          window.removeEventListener("offline", listener);
        };
      },
    },
    live: (path, onChanged) => {
      const url = new URL(path, window.location.href);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      let socket: WebSocket | undefined;
      let closed = false;
      const open = () => {
        socket = new WebSocket(url);
        socket.addEventListener("message", (event: MessageEvent<unknown>) => {
          const body: unknown = typeof event.data === "string" ? JSON.parse(event.data) : null;
          const reads = typeof body === "object" && body !== null && "reads" in body && Array.isArray(body.reads) ? body.reads : [];
          onChanged(reads.filter((read): read is string => typeof read === "string"));
        });
        socket.addEventListener("close", () => {
          if (!closed) window.setTimeout(open, 2000);
        });
      };
      open();
      return () => {
        closed = true;
        socket?.close();
      };
    },
  };
}

/** Everything the console draws, under the one address it has. Client-only: the server sends the document and the scripts. */
export function Console() {
  const made = useMemo(() => (import.meta.env.SSR ? undefined : browser()), []);
  if (made === undefined) return null;
  return (
    <PageProvider browser={made}>
      <Screens routes={routes} pages={pages} shell={Shell} />
    </PageProvider>
  );
}
