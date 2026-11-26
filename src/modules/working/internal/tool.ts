import type { AgentRole, Playbook } from "~/modules/playbook/types.ts";
import type { Work } from "~/modules/work/types.ts";
import type { ThreadRow, WorkingDeps } from "../types.ts";

/** Where a tool is called: whose work, which thread, and under which call, so that doing it again finds what it did. */
export interface Call {
  readonly c: WorkingDeps;
  readonly work: Work;
  readonly thread: ThreadRow;
  readonly id: string;
  readonly playbook: Playbook;
  readonly agent: AgentRole;
  /** The branch of this work's clone. */
  readonly branch: string;
}

/** What a tool answers the model, and what it did to the thread: it ended it, or it must wait for something that is not here. */
export type Result =
  | { readonly _tag: "Said"; readonly text: string; readonly ok: boolean }
  | { readonly _tag: "Ends"; readonly text: string }
  | { readonly _tag: "Waits"; readonly why: string }
  /** It asked a person and waits for the answer: the thread stops where it is, and goes on when it is answered. */
  | { readonly _tag: "Parks" };

export const said = (text: string): Result => ({ _tag: "Said", text, ok: true });
export const wrong = (text: string): Result => ({ _tag: "Said", text, ok: false });

export interface Tool {
  readonly name: string;
  readonly description: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly run: (call: Call, args: unknown) => Promise<Result>;
}

export const text = (description: string) => ({ type: "string", description });
export const flag = (description: string) => ({ type: "boolean", description });
export const list = (items: unknown, description: string) => ({ type: "array", items, description });
export const object = (properties: Readonly<Record<string, unknown>>, required: readonly string[]) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
