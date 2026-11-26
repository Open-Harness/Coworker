import type { Routed, Trigger } from "~/modules/triggers/types.ts";
import type { Answer, AnswerResult, WorkspaceProfile } from "../types.ts";
import { answerItem } from "./inbox.ts";
import { listManagers } from "./managers.ts";
import { settleJoin } from "./requests.ts";

/**
 * Records a person's answer once and settles a request to join. Whoever waits on it is not woken: the first product's
 * managers are gone, and the new one's loop takes an answer as a signal (`agent.signal`), which is not built.
 */
export async function answerAndSettle(sql: SqlStorage, itemId: string, given: Answer): Promise<AnswerResult> {
  const { result } = answerItem(sql, itemId, given);
  const settled = result._tag === "Answered" ? settleJoin(sql, itemId, given) : undefined;
  return settled?.admit === undefined || result._tag !== "Answered" ? result : { ...result, admit: settled.admit };
}

/** A Trigger for one of the first product's managers. None hears it now: it is dropped, with why. */
export async function hearFor(sql: SqlStorage, workspace: WorkspaceProfile | undefined, trigger: Trigger): Promise<Routed> {
  const entry = workspace === undefined ? undefined : listManagers(sql, workspace).find(({ managerId }) => managerId === trigger.managerId);
  if (entry === undefined) return { _tag: "Dropped", reason: "No such manager" };
  return { _tag: "Dropped", reason: "This manager was made by the first product, whose agents are removed" };
}
