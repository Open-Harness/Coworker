import type { ReactElement } from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { LayerProvider } from "@astryxdesign/core/Layer";
import { LinkProvider } from "@astryxdesign/core/Link";
import { afterEach, beforeEach, vi } from "vitest";
import { RouterLink, SessionGate } from "~/modules/app/service.ts";
import type { Person } from "~/modules/protocol/types.ts";
import type { AppDependencies } from "~/modules/app/types.ts";
import { PROTOCOL_VERSION } from "~/modules/protocol/service.ts";
import type { DirectoryCommand, DirectoryEvent, ModelOption } from "~/modules/protocol/types.ts";

export const me = { id: "guest:1", name: "Amina Bello" };
export const luna: ModelOption = { provider: "vibeproxy", modelId: "gpt-6-luna", label: "Luna", thinkingLevels: ["off"] };

/** The server's end of every socket the page opens. */
export class ServerSocket extends EventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static opened: ServerSocket[] = [];
  readyState = ServerSocket.CONNECTING;
  binaryType = "blob";
  readonly sent: DirectoryCommand[] = [];

  constructor(readonly url: string) {
    super();
    ServerSocket.opened.push(this);
    queueMicrotask(() => {
      this.readyState = ServerSocket.OPEN;
      this.dispatchEvent(new Event("open"));
    });
  }
  send(text: string): void {
    this.sent.push(JSON.parse(text) as DirectoryCommand);
  }
  say(event: DirectoryEvent): void {
    this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(event) }));
  }
  close(): void {
    this.readyState = ServerSocket.CLOSED;
  }
}
export const socketTo = (path: string) =>
  waitFor(() => {
    const found = ServerSocket.opened.findLast((socket) => socket.url.includes(path) && socket.readyState === 1);
    if (found === undefined) throw new Error(`Nothing opened ${path}`);
    return found;
  });

/** The command of a type that the page sent last. */
export const sentTo = <T extends DirectoryCommand["type"]>(socket: ServerSocket, type: T) =>
  waitFor(() => {
    const found = socket.sent.findLast((command) => command.type === type);
    if (found === undefined) throw new Error(`No ${type} was sent`);
    return found as Extract<DirectoryCommand, { readonly type: T }>;
  });

beforeEach(() => {
  ServerSocket.opened = [];
  vi.stubGlobal("WebSocket", ServerSocket);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Signed in as Amina. `undefined` opens the page signed out. */
export const known: Person | undefined = me;
const dependencies = (loaded: Person | undefined): AppDependencies => ({
  account: { me: async () => loaded, sendLink: vi.fn(async () => true) },
  socketUrl: (path) => `ws://server.test${path}`,
  here: () => "/",
  shareUrl: (path) => `https://server.test${path}`,
  reload: vi.fn(),
});

export function open(loaded: Person | undefined, page: ReactElement): AppDependencies {
  const provided = dependencies(loaded);
  const App = () => (
    <LinkProvider component={RouterLink}>
      <LayerProvider>
        <SessionGate dependencies={provided}>{page}</SessionGate>
      </LayerProvider>
    </LinkProvider>
  );
  const router = createRouter({
    routeTree: createRootRoute({ component: App, notFoundComponent: () => null }),
    history: createMemoryHistory(),
  });
  render(<RouterProvider router={router as never} />);
  return provided;
}
export const snapshot = (more: Partial<Extract<DirectoryEvent, { type: "directory.snapshot" }>> = {}): DirectoryEvent => ({
  type: "directory.snapshot",
  protocol: PROTOCOL_VERSION,
  me,
  models: [luna],
  workspaces: [],
  people: [me],
  agents: [],
  isAdmin: true,
  ...more,
});
