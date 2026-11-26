import type { Chosen, ModelOn, Usage } from "~/modules/choosing/types.ts";
import type { ModelConnection } from "~/modules/models/types.ts";
import type { ModelChoice, Thinking } from "~/modules/playbook/types.ts";

/*
 * One call to a model that speaks OpenAI's chat completions, streamed, and what came of it. The call itself is given: the workspace
 * makes it with its credential, so nothing here ever holds or shows a key. Anything that goes wrong is a value, in the words it was said in.
 */

export type Message =
  | { readonly role: "system" | "user"; readonly content: string }
  | {
      readonly role: "assistant";
      readonly content: string | null;
      readonly tool_calls?: readonly {
        readonly id: string;
        readonly type: "function";
        readonly function: { readonly name: string; readonly arguments: string };
      }[];
    }
  | { readonly role: "tool"; readonly tool_call_id: string; readonly content: string };

export interface ToolSpec {
  readonly name: string;
  readonly description: string;
  readonly parameters: Readonly<Record<string, unknown>>;
}

export interface Asked {
  readonly connection: string;
  readonly model: string;
  readonly thinking: Thinking;
  readonly messages: readonly Message[];
  readonly tools: readonly ToolSpec[];
}

export type Replied =
  | { readonly _tag: "Replied"; readonly message: Extract<Message, { role: "assistant" }>; readonly usage: Usage }
  | { readonly _tag: "Failed"; readonly status: number; readonly says: string };

/** The workspace's door to a model: the path under the connection, and the JSON body. */
export type Call = (path: string, body: string) => Promise<Response>;

/** The models a workspace has connected, and the one it chose when nobody else did. */
export interface Models {
  readonly connections: readonly ModelConnection[];
  readonly choice: { readonly connection: string; readonly model: string; readonly thinking: Thinking } | null;
}

export interface Completion {
  readonly ask: (call: Call, asked: Asked) => Promise<Replied>;
  /** Which model answers an agent: its own, else the manager's, else the workspace's. Never another when it does not work. */
  readonly pick: (models: Models, own: ModelChoice) => { readonly chosen: Chosen; readonly on: readonly ModelOn[] };
}
