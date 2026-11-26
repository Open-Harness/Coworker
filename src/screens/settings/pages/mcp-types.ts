import type { McpView } from "~/modules/views-workspace/types.ts";

export type Server = McpView["servers"][number] & Record<string, unknown>;
export type Tool = Server["tools"][number] & Record<string, unknown>;
export type Setting = Tool["is"];
export interface Manager {
  readonly id: string;
  readonly name: string;
}
