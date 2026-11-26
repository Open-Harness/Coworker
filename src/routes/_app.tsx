import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LayerProvider } from "@astryxdesign/core/Layer";
import { LinkProvider } from "@astryxdesign/core/Link";
import { createAccount, RouterLink, SessionGate } from "~/modules/app/service.ts";
import type { AppDependencies } from "~/modules/app/types.ts";

/** The browser's composition root: the only place that reaches for its globals. */
function browser(): AppDependencies {
  return {
    account: createAccount((path, init) => window.fetch(path, init)),
    socketUrl: (path) => {
      const url = new URL(path, window.location.href);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      url.search = "";
      return url.href;
    },
    here: () => `${window.location.pathname}${window.location.search}`,
    shareUrl: (path) => new URL(path, window.location.href).href,
    reload: () => window.location.reload(),
  };
}

const dependencies = import.meta.env.SSR ? undefined : browser();

function App() {
  if (dependencies === undefined) return null;
  return (
    <LinkProvider component={RouterLink}>
      <LayerProvider>
        <SessionGate dependencies={dependencies}>
          <Outlet />
        </SessionGate>
      </LayerProvider>
    </LinkProvider>
  );
}

export const Route = createFileRoute("/_app")({ ssr: false, component: App });
