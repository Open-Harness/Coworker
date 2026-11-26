import { defineDoc, type ToolRegistration } from "@earendil-works/pi-durable";
import { int, obj, oneOf, opt, str } from "@earendil-works/pi-schema";
import type { Recurrence, ScheduledInstruction } from "../types.ts";
import { describeRecurrence } from "./recurrence.ts";
import { ActiveDeliveries, DeliverInstruction } from "./task.ts";

const MAX_DELAY_SECONDS = 366 * 24 * 60 * 60;
const MIN_MINUTES = 5;
const TIMEZONE_SUFFIX = /(?:Z|[+-]\d{2}:\d{2})$/iu;

/** What a tool call scheduled, so replaying the call after a crash returns it instead of scheduling again. */
const ScheduleIntent = defineDoc<{ scheduled?: ScheduledInstruction }>({
  kind: "app.schedule-intent",
  version: 1,
  scope: "task",
  initial: () => ({}),
  checkpointWhen: () => false,
});

type Arguments = {
  readonly instruction: string;
  readonly delaySeconds?: number;
  readonly at?: string;
  readonly repeat?: Recurrence;
};

function resolveRunAt({ delaySeconds, at }: Arguments, now: number): number {
  if ((delaySeconds === undefined) === (at === undefined)) throw new Error("Provide exactly one of delaySeconds or at");
  if (delaySeconds !== undefined) return now + delaySeconds * 1000;
  const runAt = TIMEZONE_SUFFIX.test(at!) ? Date.parse(at!) : Number.NaN;
  if (!Number.isFinite(runAt)) throw new Error("at must be an ISO 8601 date-time with a timezone offset");
  if (runAt <= now) throw new Error("at must be in the future");
  if (runAt > now + MAX_DELAY_SECONDS * 1000) throw new Error("at is too far in the future");
  return runAt;
}

function checkRecurrence(repeat: Recurrence): Recurrence {
  if (repeat.unit === "minute" && repeat.interval < MIN_MINUTES) {
    throw new Error(`repeat.interval must be at least ${MIN_MINUTES} minutes`);
  }
  if (!isTimezone(repeat.timezone)) throw new Error("repeat.timezone must be a valid IANA timezone");
  return repeat;
}

function isTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format(0);
    return true;
  } catch {
    return false;
  }
}

function result({ id, instruction, runAt, recurrence }: ScheduledInstruction) {
  const at = new Date(runAt).toISOString();
  const repeats = recurrence === undefined ? undefined : describeRecurrence(recurrence);
  return {
    output: [
      {
        type: "text" as const,
        text: `Scheduled for ${at}${repeats === undefined ? "" : `, then ${repeats}`}: ${JSON.stringify(instruction)}. This chat will receive it then. Nothing else is needed now.`,
      },
    ],
    details: { id, instruction, runAt: at, ...(repeats === undefined ? {} : { repeats }) },
  };
}

const parameters = obj({
  instruction: str({
    minLength: 1,
    maxLength: 10_000,
    description: "What to do when it is due, as a self-contained request without timing words",
  }),
  delaySeconds: opt(int({ minimum: 1, maximum: MAX_DELAY_SECONDS, description: "For relative times: seconds from now" })),
  at: opt(str({ description: "For absolute times: ISO 8601 with a timezone offset, e.g. 2026-10-01T09:00:00+02:00" })),
  repeat: opt(
    obj(
      {
        unit: oneOf(["minute", "hour", "day", "week", "month"]),
        interval: int({ minimum: 1, maximum: 10_000 }),
        timezone: str({ minLength: 1, maxLength: 100, description: "IANA timezone, e.g. Africa/Lagos" }),
      },
      { description: "Repeat after the first run. Later runs are scheduled automatically" },
    ),
  ),
});

export const scheduleTool: ToolRegistration = {
  name: "schedule",
  description:
    "Deliver an instruction to this chat later, once or repeatedly. The chat resumes then and carries it out with its normal tools. Use it whenever someone wants something to happen later.",
  parameters,
  replay: "safe",
  execute: async (args: Arguments, api, context) => {
    const existing = (await api.snapshot(ScheduleIntent, api.taskId, context))?.scheduled;
    if (existing !== undefined) return result(existing);
    const requested: ScheduledInstruction = {
      id: `schedule:${api.taskId}`,
      conversationId: api.conversationId,
      instruction: args.instruction,
      runAt: resolveRunAt(args, api.now()),
      ...(args.repeat === undefined ? {} : { recurrence: checkRecurrence(args.repeat) }),
    };
    const deliveries = await api.snapshot(ActiveDeliveries, context);
    if (deliveries?.active.some(({ conversationId }) => conversationId === api.conversationId) === true) {
      throw new Error("A scheduled instruction cannot schedule another one");
    }
    const scheduled = await api.commit(async (tx) => {
      const intent = await tx.doc(ScheduleIntent, api.taskId);
      if (intent.scheduled !== undefined) return intent.scheduled;
      intent.scheduled = requested;
      await tx.createTask(DeliverInstruction, requested, {
        ownership: { kind: "conversation" },
        conversationId: api.conversationId,
        background: true,
      });
      return requested;
    }, context);
    return result(scheduled);
  },
};
