import type { Context } from "@earendil-works/chord/context";
import { defineSignal, type ToolExecutionApi, type ToolPark } from "@earendil-works/pi-durable";
import { obj, oneOf, str } from "@earendil-works/pi-schema";
import type { FileStore } from "~/modules/triggers/types.ts";
import type { Answer, AskResult, InboxRequest, ManagerProfile, ManagerWorkspace } from "../types.ts";

/** A person's answer, delivered to the tool call that parked on it. */
export const AnswerSignal = defineSignal({
  name: "dt.answer",
  version: 1,
  schema: obj({ decision: oneOf(["allow", "always", "deny", "text"] as const), text: str(), byId: str(), byName: str() }),
});

export const APPROVAL_OPTIONS = ["Allow once", "Always allow", "Deny"] as const;

/** What tools need from the object around them. */
export interface ToolEffects {
  /** Sends queued audit lines; runs after the commit that queued them. */
  readonly flush: () => void;
  readonly workspace: (profile: ManagerProfile) => ManagerWorkspace;
  /** Where attachments are kept, for runs to read. */
  readonly files: FileStore;
}

/** The answer this call parked for, once it has come. */
export async function answerFor(api: ToolExecutionApi, key: string, context: Context): Promise<Answer | undefined> {
  if (api.wake?.reason !== "signal") return undefined;
  const state = await api.readSignal(AnswerSignal, key, context);
  return state !== undefined && "value" in state ? state.value : undefined;
}

/**
 * Puts the item in the person's Inbox and parks until they answer. An item answered before (the same question sent
 * twice) answers at once.
 */
export async function askAndPark(
  effects: ToolEffects,
  profile: ManagerProfile,
  request: Omit<InboxRequest, "waiter" | "managerId" | "managerName">,
  api: ToolExecutionApi,
): Promise<{ readonly park: ToolPark } | { readonly answer: Answer } | { readonly failed: string }> {
  const key = request.id;
  const waiter = { managerId: profile.managerId, taskId: Number(api.taskId), key };
  let asked: AskResult;
  try {
    asked = await effects.workspace(profile).ask({ ...request, managerId: profile.managerId, managerName: profile.name, waiter });
  } catch {
    return { failed: "The workspace did not answer, so nobody could be asked. Try again later." };
  }
  if (asked._tag === "Answered") return { answer: asked.answer };
  return { park: { sleep: { signals: [AnswerSignal.key(key)], checkpoint: { item: request.id } } } };
}

export const answerWords = (answer: Answer): string =>
  answer.decision === "text" ? `${answer.byName} answered: ${answer.text}` : `${answer.byName} chose ${answer.decision}.`;
