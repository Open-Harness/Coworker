import type { EntryRecord, TranscriptItem, TranscriptView } from "@earendil-works/pi-durable";
import type { ModelRef, ThinkingLevel } from "~/modules/protocol/types.ts";

/** Who wrote a prompt. Stored beside it, so the transcript never has to parse the model's text. */
export interface Author {
  readonly id: string;
  readonly name: string;
}

export interface ToolCallView {
  readonly callId: string;
  readonly name: string;
  readonly args: Readonly<Record<string, unknown>>;
  readonly status: "pending" | "running" | "complete" | "error";
  readonly output?: string;
  readonly details?: unknown;
}

export type Gap = Extract<TranscriptItem, { readonly kind: "gap" }>;

/** One row of a chat. */
export type TranscriptBlock =
  | { readonly kind: "earlier" }
  | { readonly kind: "gap"; readonly gap: Gap }
  | { readonly kind: "prompt"; readonly id: number; readonly author: Author; readonly text: string; readonly at: number }
  | { readonly kind: "scheduled"; readonly id: number; readonly instruction: string; readonly at: number }
  | {
      readonly kind: "answer";
      readonly id: number;
      readonly text: string;
      readonly thinking: string;
      readonly calls: readonly ToolCallView[];
      readonly at: number;
      readonly end: "finished" | "stopped" | "failed";
    }
  | { readonly kind: "notice"; readonly id: number; readonly notice: "compaction" | "reset"; readonly text: string };

export interface QueuedPrompt {
  readonly submissionId: number;
  readonly mode: "steer" | "followUp";
  readonly author: Author;
  readonly text: string;
}

/** Everything the page draws of one chat. */
export interface ChatView {
  readonly blocks: readonly TranscriptBlock[];
  readonly running: boolean;
  /** The answer being written now. */
  readonly streaming?: { readonly text: string; readonly thinking: string };
  readonly retry?: { readonly at: number; readonly error: string };
  readonly compacting: boolean;
  readonly queued: readonly QueuedPrompt[];
  readonly failure?: { readonly message: string; readonly canContinue: boolean; readonly stopped: boolean };
  readonly model?: ModelRef;
  readonly thinkingLevel?: ThinkingLevel;
}

export type BuildChatView = (view: TranscriptView) => ChatView;
/** Whether an entry is something a person or a schedule said, i.e. the start of a turn. */
export type IsInput = (entry: EntryRecord) => boolean;
