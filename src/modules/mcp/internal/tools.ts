import type { Mcp } from "../types.ts";

type Tools = Parameters<Mcp["again"]>[0];
type Now = Parameters<Mcp["again"]>[1];

export function again(known: Tools, now: Now): Tools {
  return now.map((t) => {
    const was = known.find((k) => k.name === t.name);
    if (was !== undefined && was.says === t.says && was.readOnly === t.readOnly) return was;
    return { name: t.name, says: t.says, readOnly: t.readOnly, is: "ask" };
  });
}

export function toolName(server: string, tool: string): string {
  return `mcp_${server.replace(/[^A-Za-z0-9_-]/gu, "_")}_${tool.replace(/[^A-Za-z0-9_-]/gu, "_")}`;
}
