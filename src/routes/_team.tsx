import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { LayerProvider } from "@astryxdesign/core/Layer";
import { LinkProvider } from "@astryxdesign/core/Link";
import { RouterLink } from "~/modules/app/service.ts";
import { BrowserProvider, createServer, ServerProvider } from "~/modules/team-core/service.ts";
import type { Browser, Send, Server } from "~/modules/team-core/types.ts";
import { createJoinApi, Session } from "~/modules/team-join/service.ts";
import type { JoinApi } from "~/modules/team-join/types.ts";

/** The hosted app's composition root in the browser: the only place its screens' globals come from. */
function compose(): { readonly server: Server; readonly join: JoinApi; readonly browser: Browser } {
  const send: Send = (path, init) => window.fetch(path, init);
  const server = createServer(send, window.location.origin);
  return {
    server,
    join: createJoinApi(server),
    browser: {
      here: () => `${window.location.pathname}${window.location.search}`,
      goTo: (url) => window.location.assign(url),
      newId: () => window.crypto.randomUUID(),
      listenKeys: (onKey) => {
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
      },
    },
  };
}

const composed = import.meta.env.SSR ? undefined : compose();

function TeamRoot() {
  const isJoining = useRouterState({ select: (state) => state.location.pathname.startsWith("/join/") });
  if (composed === undefined) return null;
  return (
    <LinkProvider component={RouterLink}>
      <LayerProvider>
        <BrowserProvider browser={composed.browser}>
          <ServerProvider server={composed.server}>
            <Session api={composed.join} isOpen={isJoining}>
              <Outlet />
            </Session>
          </ServerProvider>
        </BrowserProvider>
      </LayerProvider>
    </LinkProvider>
  );
}

export const Route = createFileRoute("/_team")({ ssr: false, component: TeamRoot });
