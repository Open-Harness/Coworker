import type { Models } from "~/modules/completion/types.ts";
import type { ConsoleDeps } from "../types.ts";

const THINKING = ["off", "low", "medium", "high"] as const;

/** The workspace's models, and the one it chose when nobody said otherwise: what the co-worker thinks with. */
export async function modelsOf(c: ConsoleDeps): Promise<Models> {
  const value = await c.store.setting("choice");
  const one = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const level = THINKING.find((name) => name === one["thinking"]);
  return {
    connections: await c.outside.connections(),
    choice:
      typeof one["connection"] === "string" && typeof one["model"] === "string"
        ? { connection: one["connection"], model: one["model"], thinking: level ?? "low" }
        : null,
  };
}
