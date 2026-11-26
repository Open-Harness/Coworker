import type { Step } from "~/modules/playbook/types.ts";
import type { ThreadRef, ToDo } from "../types.ts";
import { type Stamp, keyOf } from "./made.ts";

export function startTodo(e: Stamp, step: Step | string, agent: string, role: "does" | "checks", fresh: boolean, brief: string): ToDo {
  return { key: keyOf(e, "start"), do: "start", step: typeof step === "string" ? step : step.id, agent, role, fresh, brief };
}

export function tellTodo(e: Stamp, thread: string, what: string): ToDo {
  return { key: keyOf(e, `tell:${thread}`), do: "tell thread", thread, what };
}

export function sayTodo(e: Stamp, where: ThreadRef, text: string): ToDo {
  return { key: keyOf(e, "say"), do: "say", where, text };
}

export function endThreadsTodo(e: Stamp): ToDo {
  return { key: keyOf(e, "end threads"), do: "end threads" };
}

export function endTodos(e: Stamp): readonly ToDo[] {
  return [endThreadsTodo(e), { key: keyOf(e, "end box"), do: "end box" }];
}
