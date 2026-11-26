import type { Answer, ManagerObjects } from "~/modules/manager/types.ts";
import type { Routed, Trigger } from "~/modules/triggers/types.ts";
import type { AnswerResult, WorkspaceProfile } from "../types.ts";
import { receive } from "./hearing.ts";
import { answerItem } from "./inbox.ts";
import { listManagers } from "./managers.ts";
import { settleJoin } from "./requests.ts";

/** Records a person's answer once, settles a request to join, and wakes the managers waiting on it. */
export async function answerAndWake(
  sql: SqlStorage,
  workspace: WorkspaceProfile,
  managers: ManagerObjects,
  itemId: string,
  given: Answer,
): Promise<AnswerResult> {
  const { result, waiters } = answerItem(sql, itemId, given);
  const settled = result._tag === "Answered" ? settleJoin(sql, itemId, given) : undefined;
  const entries = listManagers(sql, workspace);
  for (const waiter of waiters) {
    const entry = entries.find(({ managerId }) => managerId === waiter.managerId);
    if (entry !== undefined) await managers.get(entry.objectId, entry.region).deliver(waiter, given);
  }
  return settled?.admit === undefined || result._tag !== "Answered" ? result : { ...result, admit: settled.admit };
}

/** Routes a Trigger and, for work, hands it to its manager before answering. */
export async function hearFor(
  sql: SqlStorage,
  workspace: WorkspaceProfile | undefined,
  managers: ManagerObjects,
  trigger: Trigger,
  now: number,
): Promise<Routed> {
  const entry = workspace === undefined ? undefined : listManagers(sql, workspace).find(({ managerId }) => managerId === trigger.managerId);
  if (entry === undefined) return { _tag: "Dropped", reason: "No such manager" };
  const manager = managers.get(entry.objectId, entry.region);
  return receive(sql, trigger, now, async (routed) => {
    const heard = await manager.hear(trigger, routed);
    if (heard._tag !== "Heard") throw new Error("The manager is not set up");
  });
}
