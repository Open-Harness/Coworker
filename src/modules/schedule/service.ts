import type { Context } from "@earendil-works/chord/context";
import type { Cursor, Harness } from "@earendil-works/pi-durable";
import type { ScheduleRow } from "~/modules/protocol/types.ts";
import { describeRecurrence } from "./internal/recurrence.ts";
import { DeliverInstruction } from "./internal/task.ts";
import type { ScheduledInstruction } from "./types.ts";

export { nextOccurrence } from "./internal/recurrence.ts";
export { deliveryText, DeliverInstruction } from "./internal/task.ts";
export { scheduleTool } from "./internal/tool.ts";

const PAGE = 100;

/** Instructions still waiting for their time, soonest first. */
export async function listSchedules(harness: Pick<Harness, "commit">, context: Context): Promise<readonly ScheduleRow[]> {
  const rows = await harness.commit(async (tx) => {
    const found: ScheduleRow[] = [];
    let cursor: Cursor | undefined;
    do {
      const page = await tx.scanTasks({ kind: DeliverInstruction.definition.name, status: "sleeping" }, PAGE, cursor);
      for (const task of page.items) {
        const input = task.input as ScheduledInstruction;
        found.push({
          taskId: task.id,
          chatId: input.conversationId,
          instruction: input.instruction,
          runAt: input.runAt,
          ...(input.recurrence === undefined ? {} : { repeats: describeRecurrence(input.recurrence) }),
        });
      }
      cursor = page.next;
    } while (cursor !== undefined);
    return found;
  }, context);
  return rows.sort((left, right) => left.runAt - right.runAt);
}
