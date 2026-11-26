import type { Did } from "~/modules/api/types.ts";
import type { Thinking } from "~/modules/playbook/types.ts";
import type { ConsoleDeps } from "../types.ts";

/* A model somebody chose: one that is connected, works, and lists it, with a thinking level. The workspace's, or a manager's own. */

export const THINKING: readonly Thinking[] = ["off", "low", "medium", "high"];
const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

export interface Chosen {
  readonly connection: string;
  readonly model: string;
  readonly thinking: Thinking;
  /** The connection's name, for the sentence in the log. */
  readonly label: string;
}

/** What was chosen, or why it cannot be. */
export async function chosenFrom(c: ConsoleDeps, values: Readonly<Record<string, unknown>>): Promise<Chosen | Did> {
  const [connection, model, thinking] = [text(values["connection"]), text(values["model"]), text(values["thinking"]) || "low"];
  const found = (await c.outside.connections()).find(({ id }) => id === connection);
  if (found === undefined) return { _tag: "Refused", why: `There is no connection "${connection}" here.` };
  if (found.check._tag !== "Works") return { _tag: "Refused", why: `${found.label} does not work now: ${found.check.error}` };
  if (!found.models.includes(model)) return { _tag: "Refused", why: `${found.label} does not list a model called "${model}".` };
  const level = THINKING.find((one) => one === thinking);
  if (level === undefined) return { _tag: "Refused", why: `Thinking is one of ${THINKING.join(", ")}.` };
  return { connection, model, thinking: level, label: found.label };
}

export const isChosen = (value: Chosen | Did): value is Chosen => !("_tag" in value);

/** Where a manager's own choice is kept: in the workspace's settings, under the manager. */
export const managerModel = (manager: string): string => `manager.model.${manager}`;
