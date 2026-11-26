import type { Evidence, ThreadRef, Work } from "~/modules/work/types.ts";
import type { AgentRole, Check, Files } from "~/modules/playbook/types.ts";
import type { Mandate } from "~/modules/reach/types.ts";

/*
 * Conversations of the agent: one per conversation in a connector that a piece of work follows, a fork of the manager's
 * at its playbook page. A checker's and a judge's are fresh. This module owns what each is told, what it is offered, what
 * its tools are called, and what it left behind. The names below are the contract with the models and with the evals.
 */

/** Base tools, the same for every agent. `read`, `write`, `edit` and `bash` are pi-durable's own, with its args, in the work's box. */
export type BaseTool = "read" | "write" | "edit" | "bash" | "web_read" | "web_search" | "note" | "ask" | "done_when" | "report" | "skill";
/** A checker has these and `read`, `bash`, `skill`: it cannot write. The judge has only `judge`. */
export type CheckerTool = "check";
export type JudgeTool = "judge";
/** The co-worker's, in a chat. Connector actions never come here: managers do those. */
export type CoworkerTool = "find" | "look" | "act" | "show_me" | "note" | "web_read" | "web_search" | "set_up";

export interface ToolArgs {
  readonly note: { readonly says: string };
  /** Parks until a person answers. Without `to`: who answers for the work. */
  readonly ask: { readonly question: string; readonly options?: readonly string[]; readonly best?: string; readonly to?: string };
  readonly done_when: { readonly checks: readonly Check[] };
  readonly report: {
    readonly result: "done" | "no" | "stuck";
    readonly says: string;
    readonly evidence: readonly { readonly check: string; readonly met: boolean; readonly says: string; readonly link?: string }[];
  };
  readonly check: {
    readonly evidence: readonly { readonly check: string; readonly met: boolean; readonly says: string; readonly at?: string }[];
    readonly says: string;
  };
  readonly judge: {
    readonly verdicts: readonly {
      readonly manager: string;
      readonly kind: string;
      readonly is: boolean;
      readonly why: string;
      readonly fit: number;
    }[];
    readonly joins?: string;
  };
  readonly skill: { readonly id: string; readonly path?: string };
  readonly web_read: { readonly url: string };
  readonly web_search: { readonly words: string };
  readonly find: { readonly words: string };
  readonly look: { readonly at: "work" | "manager" | "intake" | "spending" | "asks" | "thread" | "playbook"; readonly id?: string };
  readonly act: { readonly doing: string; readonly values: Readonly<Record<string, string>> };
  readonly show_me: { readonly doing: string; readonly values: Readonly<Record<string, string>> };
  readonly set_up: { readonly event: unknown };
}

export type Role = "does" | "checks" | "judges" | "searches" | "speaks" | "tries";

/** Everything an agent is told, in this order, and nothing else. */
export interface Brief {
  readonly role: Role;
  readonly page: string;
  readonly agent: Pick<AgentRole, "name" | "told">;
  readonly skills: readonly { readonly id: string; readonly says: string }[];
  readonly work: Pick<Work, "id" | "title" | "about" | "doneWhen" | "step"> | null;
  readonly place: { readonly says: string; readonly files: Files } | null;
  /** From outside, marked so, oldest first. */
  readonly thread: readonly { readonly by: string; readonly at: number; readonly text: string }[];
  readonly notes: readonly string[];
  readonly todo: string;
}

export interface Offer {
  readonly tools: readonly string[];
  /** On in the mandate, but a person is asked before each. */
  readonly asks: readonly string[];
}

/** One line of a thread, as it can be read. */
export type Line = { readonly id: string; readonly at: number } & (
  | { readonly is: "said"; readonly text: string }
  | { readonly is: "thought"; readonly text: string }
  | { readonly is: "told"; readonly by: string; readonly text: string }
  | {
      readonly is: "called";
      readonly tool: string;
      readonly target: string;
      readonly args: unknown;
      readonly out: string;
      readonly ok: boolean;
      readonly took: number;
    }
  | { readonly is: "asked"; readonly ask: string; readonly question: string; readonly answer: string | null }
  | { readonly is: "ended"; readonly says: string; readonly why: "reported" | "unanswered" | "stopped" | "over its limit" }
);

export interface ThreadView {
  readonly id: string;
  readonly manager: string;
  readonly work: string | null;
  readonly under: string | null;
  readonly agent: string;
  readonly role: Role;
  readonly version: number;
  readonly model: string;
  readonly on: ThreadRef | null;
  readonly state: "working" | "waits" | "ended";
  readonly started: number;
  readonly took: number;
  readonly cost: number;
  readonly mayUse: readonly string[];
  readonly brief: string;
  readonly lines: readonly Line[];
  readonly diff: string | null;
  readonly files: readonly { readonly path: string; readonly change: "added" | "changed" | "gone" }[];
}

export interface Threads {
  /** The prompt, in order. Outside words are in a block that says so, and cannot close it. */
  readonly prompt: (brief: Brief) => { readonly system: string; readonly user: string };
  /** Exactly what this agent may use: its own list, with what the mandate has on or ask. Never more. */
  readonly offer: (
    role: Role,
    agent: Pick<AgentRole, "tools">,
    mandate: Mandate | null,
    at: { readonly account: string; readonly place: string } | null,
  ) => Offer;
  /** What a call said, narrowed. Wrong ones come back to the model in words. */
  readonly read: <T extends keyof ToolArgs>(
    tool: T,
    args: unknown,
  ) => { readonly _tag: "Args"; readonly args: ToolArgs[T] } | { readonly _tag: "Wrong"; readonly says: string };
  /** A report's evidence, as evidence: by this agent, in this thread. */
  readonly evidence: (
    args: ToolArgs["report"] | ToolArgs["check"],
    by: { readonly agent: string; readonly thread: string },
    at: number,
  ) => readonly Evidence[];
}
