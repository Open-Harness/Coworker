import type { Call, Message, Models } from "~/modules/completion/types.ts";

/*
 * The co-worker's own turns: a conversation of messages, a model, and the tools it may call. A turn asks the model, does what it called,
 * and asks again, until the model says something without calling, or cannot be had. Everything outside is given.
 */

/** What the model calls, and the words it is answered in. A call that is wrong is answered in words, never thrown. */
export interface TurnTool {
  readonly name: string;
  readonly description: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly run: (args: unknown) => Promise<string>;
}

/** The messages of one conversation, as a model is sent them; each is kept as it is made, so that a lost object goes on from the last. */
export interface TurnThread {
  readonly messages: () => Promise<readonly Message[]>;
  readonly add: (message: Message) => Promise<void>;
}

export interface TurnDeps {
  readonly thread: TurnThread;
  readonly models: () => Promise<Models>;
  readonly call: Call;
  readonly tools: readonly TurnTool[];
}

export type Turned =
  /** It said what it had to say, or nothing more. */
  | { readonly _tag: "Idle" }
  /** No model could be asked, or it did not answer: why, in words. Nothing was lost. */
  | { readonly _tag: "Failed"; readonly why: string };

export interface Turns {
  /** Goes on from the last message until the model has nothing more to call. At most `MOST` calls in one go. */
  readonly run: (deps: TurnDeps) => Promise<Turned>;
}
