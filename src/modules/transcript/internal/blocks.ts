import type { AssistantMessage } from "@earendil-works/pi-ai";
import {
  AssistantEntry,
  CompactionEntry,
  type EntryRecord,
  type LiveState,
  ResetEntry,
  ToolResultEntry,
  type TranscriptItem,
} from "@earendil-works/pi-durable";
import type { ToolCallView, TranscriptBlock } from "../types.ts";
import { authorOf, isInput, isRecord, ScheduledEntry, withoutAttribution } from "./entries.ts";
import { compactionSummary, contentText, messageText, thinkingText } from "./text.ts";

interface ToolOutcome {
  readonly isError: boolean;
  readonly output: string;
  readonly details?: unknown;
}

/** Results by call id. The engine appends a rendered diagnostics block to a result; it is for the model, not for people. */
function outcomes(items: readonly TranscriptItem[]): ReadonlyMap<string, ToolOutcome> {
  const found = new Map<string, ToolOutcome>();
  for (const item of items) {
    if (item.kind !== "entry" || !ToolResultEntry.is(item.entry)) continue;
    const message = item.entry.model?.[0];
    if (message?.role !== "toolResult") continue;
    const data: unknown = item.entry.data;
    const diagnosed = isRecord(data) && Array.isArray(data.diagnostics) && data.diagnostics.length > 0;
    found.set(message.toolCallId, {
      isError: message.isError,
      output: contentText(diagnosed ? message.content.slice(0, -1) : message.content),
      ...(message.details === undefined ? {} : { details: message.details }),
    });
  }
  return found;
}

function callView(
  call: { readonly id: string; readonly name: string; readonly arguments: Readonly<Record<string, unknown>> },
  results: ReadonlyMap<string, ToolOutcome>,
  live: LiveState,
): ToolCallView {
  const base = { callId: call.id, name: call.name, args: call.arguments };
  const result = results.get(call.id);
  if (result !== undefined) {
    return {
      ...base,
      status: result.isError ? "error" : "complete",
      output: result.output,
      ...(result.details === undefined ? {} : { details: result.details }),
    };
  }
  const slot = live.tools?.find(({ callId }) => callId === call.id);
  if (slot === undefined) return { ...base, status: live.run === undefined ? "error" : "pending" };
  return {
    ...base,
    // A parked call (`sleeping`, `waiting`) has not answered yet; to a reader it is still running.
    status: slot.status === "done" ? "complete" : slot.status === "pending" ? "pending" : "running",
    ...(slot.output === undefined ? {} : { output: slot.output }),
    ...(slot.details === undefined ? {} : { details: slot.details }),
  };
}

function answerBlock(
  entry: EntryRecord,
  message: AssistantMessage,
  results: ReadonlyMap<string, ToolOutcome>,
  live: LiveState,
): TranscriptBlock {
  const calls = message.content.flatMap((part) => (part.type === "toolCall" ? [callView(part, results, live)] : []));
  return {
    kind: "answer",
    id: entry.id,
    text: contentText(message.content),
    thinking: thinkingText(message.content),
    calls,
    at: message.timestamp,
    end: message.stopReason === "error" ? "failed" : message.stopReason === "aborted" ? "stopped" : "finished",
  };
}

function entryBlock(entry: EntryRecord, results: ReadonlyMap<string, ToolOutcome>, live: LiveState): TranscriptBlock | undefined {
  const message = entry.model?.[0];
  if (CompactionEntry.is(entry)) {
    return { kind: "notice", id: entry.id, notice: "compaction", text: compactionSummary(messageText(message)) };
  }
  if (ResetEntry.is(entry)) return { kind: "notice", id: entry.id, notice: "reset", text: messageText(message) };
  if (ScheduledEntry.is(entry)) {
    return { kind: "scheduled", id: entry.id, instruction: entry.data.instruction, at: message?.timestamp ?? 0 };
  }
  if (isInput(entry)) {
    const text = messageText(message);
    return {
      kind: "prompt",
      id: entry.id,
      author: authorOf(entry, text),
      text: withoutAttribution(text),
      at: message?.timestamp ?? 0,
    };
  }
  if (AssistantEntry.is(entry) && message?.role === "assistant") return answerBlock(entry, message, results, live);
  return undefined;
}

export function transcriptBlocks(items: readonly TranscriptItem[], live: LiveState): TranscriptBlock[] {
  const results = outcomes(items);
  return items.flatMap((item): TranscriptBlock[] => {
    if (item.kind === "earlier") return [{ kind: "earlier" }];
    if (item.kind === "gap") return [{ kind: "gap", gap: item }];
    const block = entryBlock(item.entry, results, live);
    return block === undefined ? [] : [block];
  });
}
