import type { ExecutionEnv } from "@earendil-works/pi-durable/env";
import type { Clock } from "~/modules/clock/types.ts";
import type { PiModels } from "~/modules/models/types.ts";
import type { ModelChoice } from "~/modules/playbook/types.ts";
import type { Telemetry } from "~/modules/telemetry/types.ts";

/*
 * The loop: how an agent runs. One pi-durable Harness in each manager's Durable Object, over that object's SQLite. A piece of
 * work is a conversation; each thread on it is a fork of it at the playbook page (`does`), or a fresh conversation that has not
 * seen the doing (`checks`). Every tool call is a durable task. Every model call goes through pi-ai. A wait for the outside
 * (a person's answer, CI) is a parked tool woken by a signal, never a poll. Orthograph's shape for this is `Agent.open` over
 * Pi Durable (design/frame/examples/agents.md): the loop owns the transcript, `work` owns the lifecycle.
 *
 * Not built. Every call answers `NotBuilt`.
 */

export type { ModelChoice };

/**
 * A tool of the product, as the loop is given it: it becomes a pi-durable `defineTool`. `parameters` is a JSON Schema. A wrong
 * call is answered in words, never thrown.
 */
export interface AppTool {
  readonly name: string;
  readonly description: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  /** `call`: the pi-durable call id, the same on a replay, so a tool with an outside effect does it once. */
  readonly run: (args: unknown, call: string) => Promise<string>;
}

/** One model call and no loop, through pi-ai. With `tool`, the model is made to call it, and `called` is its arguments. */
export interface Asked {
  readonly instructions: string;
  readonly text: string;
  readonly model: ModelChoice;
  readonly tool?: Omit<AppTool, "run">;
}

/** What goes wrong, as a value. Nothing here is thrown. */
export type AgentError =
  | { readonly _tag: "NotBuilt"; readonly what: string }
  | { readonly _tag: "NoModel"; readonly why: string }
  | { readonly _tag: "ModelFailed"; readonly why: string }
  | { readonly _tag: "OverBudget"; readonly spent: number; readonly limit: number }
  | { readonly _tag: "OutOfTurns"; readonly turns: number }
  | { readonly _tag: "BoxDenied"; readonly why: string }
  | { readonly _tag: "Interrupted"; readonly why: string }
  | { readonly _tag: "StorageFailed"; readonly why: string };

/** One thread on one piece of work: who, in what part, told what, with which tools. The same `thread` twice opens it once. */
export interface Brief {
  readonly work: string;
  readonly thread: string;
  readonly agent: string;
  readonly role: "does" | "checks";
  readonly step: string;
  /** What it is told, made by `threads` (outside words fenced off from the prompt's own). */
  readonly prompt: string;
  readonly model: ModelChoice;
  /** The tools it is offered, by name; `asks` are the ones that wait for a person's yes first. */
  readonly tools: readonly string[];
  readonly asks: readonly string[];
  /** Dollars this work may still spend. */
  readonly budget: number;
}

/** How a thread's run ended, told to whoever owns the work (`Working.news`). */
export type Ended =
  | { readonly _tag: "Reported"; readonly thread: string; readonly result: "done" | "stuck" | "no"; readonly says: string }
  | { readonly _tag: "Checked"; readonly thread: string; readonly met: boolean; readonly says: string }
  | { readonly _tag: "Failed"; readonly thread: string; readonly error: AgentError };

/** One line of a thread, for the work's page: what the agent said or did, never a secret. */
export interface Line {
  readonly at: number;
  readonly by: "agent" | "tool" | "person";
  readonly text: string;
}

/** When the host must wake the object: pi-durable's `Wake`. `active`: something can run now. */
export interface Wake {
  readonly active: boolean;
  readonly at: number | null;
}

export type Opened = { readonly _tag: "Opened" | "AlreadyOpen"; readonly thread: string };
export type Signalled = { readonly _tag: "Delivered" | "Duplicate" | "Closed" };

export interface Agent {
  /** Starts a thread on a piece of work. */
  readonly open: (brief: Brief) => Promise<Opened | AgentError>;
  /** Something for a thread to hear (a comment, a review): it goes on with it, after what it is doing. Once by key. */
  readonly tell: (thread: string, text: string, key: string) => Promise<{ readonly _tag: "Told" } | AgentError>;
  /** What a parked call waited for: a person's answer, a CI result. Once by key. */
  readonly signal: (thread: string, key: string, value: unknown) => Promise<Signalled | AgentError>;
  readonly stop: (thread: string, why: string) => Promise<{ readonly _tag: "Stopped" } | AgentError>;
  readonly lines: (thread: string) => Promise<readonly Line[] | AgentError>;
  /**
   * A conversation with a person or about one thing (Juno's chat, a weekly look at a manager): one answer to one line, told
   * `instructions` when it begins, with its own tools, going on until it has nothing more to call. Once by key.
   */
  readonly answer: (
    conversation: string,
    line: { readonly key: string; readonly text: string; readonly by: string },
    setup: { readonly instructions: string; readonly tools: readonly AppTool[]; readonly model: ModelChoice },
  ) => Promise<{ readonly _tag: "Answered"; readonly text: string } | AgentError>;
  /** A new conversation that knows what `conversation` knew up to the line with `key`, and nothing after: pi-durable's `fork`. */
  readonly fork: (conversation: string, key: string, into: string) => Promise<{ readonly _tag: "Forked" } | AgentError>;
  readonly ask: (asked: Asked) => Promise<{ readonly _tag: "Said"; readonly text: string; readonly called: unknown } | AgentError>;
  /** The host's alarm: what pi-durable's `onWake` says, and `resume` when it fires. */
  readonly wake: () => Wake;
  readonly resume: () => void;
}

/** What the loop is given, by the manager's object. Nothing is read from anywhere. */
export interface AgentDeps {
  /** The object's own storage: pi-durable's `openDurableObjectSqliteStorage`. */
  readonly storage: DurableObjectStorage;
  readonly models: PiModels;
  /** The box of a piece of work, as pi-durable's read, write, edit and bash see it. */
  readonly env: (work: string) => Promise<ExecutionEnv>;
  readonly telemetry: Telemetry;
  readonly clock: Clock;
  /** A thread's run ended. */
  readonly ended: (ended: Ended) => Promise<void>;
  readonly onWake: (wake: Wake) => void;
}
