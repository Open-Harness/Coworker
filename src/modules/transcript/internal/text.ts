import type { Message } from "@earendil-works/pi-ai";
import { isRecord } from "./entries.ts";

/** The text parts of message content, one per line. */
export function contentText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part: unknown) => {
      if (!isRecord(part)) return "";
      if (part.type === "text" && typeof part.text === "string") return part.text;
      return part.type === "image" ? "[Image]" : "";
    })
    .filter(Boolean)
    .join("\n");
}

export function thinkingText(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content
    .map((part: unknown) => (isRecord(part) && part.type === "thinking" && typeof part.thinking === "string" ? part.thinking : ""))
    .filter(Boolean)
    .join("\n\n");
}

/** Plain text of a user or assistant message. Tool results have none here. */
export const messageText = (message: Message | undefined): string =>
  message === undefined || message.role === "toolResult" || message.role === "system" ? "" : contentText(message.content);

/** Compaction entries wrap the summary in the engine's fixed `<summary>` framing. */
export const compactionSummary = (text: string): string => /<summary>\n([\s\S]*)\n<\/summary>$/u.exec(text)?.[1] ?? text;
