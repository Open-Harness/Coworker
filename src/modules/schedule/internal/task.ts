import { type ConversationId, defineDoc, defineTask } from "@earendil-works/pi-durable";
import { ScheduledEntry } from "~/modules/transcript/service.ts";
import type { ScheduledInstruction } from "../types.ts";
import { nextOccurrence } from "./recurrence.ts";

type DeliveryState = { phase: "wait" } | { phase: "mark" } | { phase: "deliver" };

/** Deliveries running now, so a delivery cannot schedule itself in a loop. */
export const ActiveDeliveries = defineDoc<{ active: { scheduleId: string; conversationId: ConversationId }[] }>({
  kind: "app.schedule-deliveries",
  version: 1,
  scope: "session",
  initial: () => ({ active: [] }),
  // Changes with every delivery: store a small base whenever none is active, so replay stays short.
  checkpointWhen: (value) => value.active.length === 0,
});

const removeDelivery = (deliveries: { active: { scheduleId: string }[] }, scheduleId: string): void => {
  const index = deliveries.active.findIndex((delivery) => delivery.scheduleId === scheduleId);
  if (index !== -1) deliveries.active.splice(index, 1);
};

export const deliveryText = (instruction: string): string => `Scheduled instruction due now: ${instruction}`;

export const DeliverInstruction = defineTask<ScheduledInstruction, DeliveryState, null>({
  name: "app.deliver-instruction",
  version: 1,
  initial: () => ({ phase: "wait" }),
  phases: {
    // A durable sleep: nothing runs until then, and `onWake` moves the object's alarm.
    wait: (task, runtime, context) => runtime.sleepUntil(task.input.runAt, { phase: "mark" }, context),
    mark: async (task, runtime, context) => {
      const { id, conversationId, recurrence, runAt } = task.input;
      await runtime.commit(async (tx) => {
        const deliveries = await tx.doc(ActiveDeliveries);
        if (!deliveries.active.some(({ scheduleId }) => scheduleId === id)) {
          deliveries.active.push({ scheduleId: id, conversationId });
        }
        // The next occurrence is created in the commit that starts this one: never lost, never doubled.
        if (recurrence !== undefined) {
          const next = nextOccurrence(runAt, recurrence, runtime.now());
          await tx.createTask(
            DeliverInstruction,
            { ...task.input, id: `${id.split("@")[0]!}@${next}`, runAt: next },
            { ownership: { kind: "conversation" }, conversationId, background: true },
          );
        }
        return { status: "running", checkpoint: { phase: "deliver" } };
      }, context);
    },
    deliver: async (task, runtime, context) => {
      const { id, conversationId, instruction } = task.input;
      try {
        const conversation = await runtime.conversation(conversationId, context);
        if (conversation === undefined) {
          runtime.report(new Error(`Schedule ${id}: conversation ${conversationId} is missing`));
        } else {
          const submission = await conversation.submit(
            {
              type: "input",
              content: deliveryText(instruction),
              entry: { kind: ScheduledEntry.kind, data: { scheduleId: id, instruction } },
              requestId: id,
              whenBusy: "followUp",
            },
            context,
          );
          await submission.wait(context);
        }
      } finally {
        await runtime.commit(async (tx) => {
          removeDelivery(await tx.doc(ActiveDeliveries), id);
          return { status: "running", checkpoint: { phase: "deliver" } };
        }, context);
      }
      await runtime.commit(() => ({ status: "terminal", outcome: { status: "completed", result: null } }), context);
    },
  },
  abort: async (task, runtime, context) => {
    await runtime.commit(async (tx) => {
      removeDelivery(await tx.doc(ActiveDeliveries), task.input.id);
      return { status: "terminal", outcome: { status: "aborted" } };
    }, context);
  },
});
