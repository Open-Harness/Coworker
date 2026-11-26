import { add } from "./internal/add.ts";
import { callTool, listed } from "./internal/call.ts";
import type { McpDeps, Servers } from "./types.ts";

export const createServers = (c: McpDeps): Servers => ({
  handle: async (call) => {
    switch (call.is) {
      case "add":
        return { is: "added", added: await add(c, call.server, call.by) };
      case "list":
        return listed(c);
      case "call":
        return callTool(c, call.name, call.args);
    }
  },
});
