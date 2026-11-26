import type { AgentState, InboxState, LiveState, RunFailure, TranscriptView } from "@earendil-works/pi-durable";
import { authorOf, withoutAttribution } from "./internal/entries.ts";
import { transcriptBlocks } from "./internal/blocks.ts";
import { contentText, thinkingText } from "./internal/text.ts";
import type { BuildChatView, ChatView, QueuedPrompt } from "./types.ts";

export { attributedText, AuthoredEntry, isInput, ScheduledEntry, withoutAttribution } from "./internal/entries.ts";
export { messageText } from "./internal/text.ts";

const REASONS: Readonly<Record<RunFailure["reason"], string>> = {
  model_error: "The model request failed",
  no_model: "No model is available",
  aborted: "The run was stopped",
  reset: "The context was reset",
  faulted: "The run crashed",
  orphaned: "The run cannot continue here",
  interrupted: "The server stopped while the model was answering",
  restart_limit: "The run was cut off too often",
  nothing_to_answer: "There was nothing to answer",
  turn_limit: "The run reached its tool limit",
};
/** Failures a person can retry as they are. After the others, sending a new prompt is the way on. */
const CONTINUABLE: ReadonlySet<RunFailure["reason"]> = new Set([
  "model_error",
  "no_model",
  "aborted",
  "faulted",
  "interrupted",
  "restart_limit",
  "turn_limit",
]);

const detailText = (detail: unknown): string =>
  typeof detail === "string" ? `: ${detail}` : detail === undefined ? "" : `: ${JSON.stringify(detail)}`;

function failureOf(live: LiveState): ChatView["failure"] {
  const run = live.runFailure;
  if (run !== undefined) {
    return {
      message: `${REASONS[run.reason] ?? run.reason}${detailText(run.detail)}`,
      canContinue: CONTINUABLE.has(run.reason),
      stopped: run.reason === "aborted",
    };
  }
  const compaction = live.compactionFailure;
  return compaction === undefined
    ? undefined
    : { message: `Could not shorten the context: ${compaction.error}`, canContinue: false, stopped: false };
}

function queuedPrompts(inbox: InboxState | undefined): readonly QueuedPrompt[] {
  return (inbox?.items ?? []).flatMap((item): QueuedPrompt[] => {
    if (item.mode === "write") return [];
    const text = contentText(item.content);
    return [
      {
        submissionId: item.id,
        mode: item.mode,
        author: authorOf({ kind: item.entry?.kind ?? "", data: item.entry?.data }, text),
        text: withoutAttribution(text),
      },
    ];
  });
}

/** The engine keys a view's documents by kind and types them as JSON; these are its built-in kinds. */
const builtInDocs = (view: TranscriptView) => ({
  live: (view.docs["pi.live"] ?? {}) as unknown as LiveState,
  inbox: view.docs["pi.inbox"] as unknown as InboxState | undefined,
  agent: (view.docs["pi.agent"] ?? {}) as AgentState,
});

export const buildChatView: BuildChatView = (view) => {
  const { live, inbox, agent } = builtInDocs(view);
  const generation = live.generation;
  const failure = failureOf(live);
  return {
    blocks: transcriptBlocks(view.items, live),
    running: live.run !== undefined,
    ...(generation?.message === undefined
      ? {}
      : {
          streaming: {
            text: contentText(generation.message.content),
            thinking: thinkingText(generation.message.content),
          },
        }),
    ...(generation?.retry === undefined ? {} : { retry: generation.retry }),
    compacting: (live.compactions ?? []).length > 0,
    queued: queuedPrompts(inbox),
    ...(failure === undefined ? {} : { failure }),
    ...(agent.model === undefined ? {} : { model: agent.model }),
    ...(agent.thinkingLevel === undefined ? {} : { thinkingLevel: agent.thinkingLevel }),
  };
};
