import { createContext, type ReactNode, use } from "react";
import type { Server } from "../types.ts";

const ServerContext = createContext<Server | undefined>(undefined);

/** Gives the line to the server to every screen under it. */
export const ServerProvider = ({ server, children }: { readonly server: Server; readonly children: ReactNode }) => (
  <ServerContext value={server}>{children}</ServerContext>
);

export function useServer(): Server {
  const server = use(ServerContext);
  if (server === undefined) throw new Error("A screen of the app was drawn outside ServerProvider");
  return server;
}
