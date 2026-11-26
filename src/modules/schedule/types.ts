import type { ConversationId } from "@earendil-works/pi-durable";

export type Recurrence = {
  readonly unit: "minute" | "hour" | "day" | "week" | "month";
  readonly interval: number;
  /** IANA timezone used for calendar recurrence, including daylight-saving changes. */
  readonly timezone: string;
};

/** Durable input of one delivery. */
export type ScheduledInstruction = {
  readonly id: string;
  readonly conversationId: ConversationId;
  readonly instruction: string;
  /** Unix milliseconds on the engine's clock. */
  readonly runAt: number;
  readonly recurrence?: Recurrence;
};

/** The first occurrence after `now`, counted from the previous one. */
export type NextOccurrence = (previousRunAt: number, recurrence: Recurrence, now: number) => number;
