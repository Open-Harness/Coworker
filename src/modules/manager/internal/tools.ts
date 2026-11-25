import type { Context } from "@earendil-works/chord/context";
import type { ConversationId, ToolExecutionApi, ToolExecutionResult, ToolPark, ToolRegistration } from "@earendil-works/pi-durable";
import { CATALOGUE } from "~/modules/actions/service.ts";
import type { Mounted } from "~/modules/agent-engine/types.ts";
import type { ActionSpec } from "~/modules/actions/types.ts";
import type { Answer, ManagerProfile } from "../types.ts";
import { APPROVAL_OPTIONS, answerFor, answerWords, askAndPark, type ToolEffects } from "./asking.ts";
import { asDetail } from "./detail.ts";
import { closeQuestion, decide, type Outcome, questionItemId } from "./call.ts";
import { launchFor } from "./launch.ts";
import { PARAMETERS } from "./parameters.ts";
import { abortRun, stoppedConversation } from "./stop.ts";
import { ProfileDoc } from "./state.ts";

/** Providers allow only letters, digits, `_` and `-` in tool names, so `task.create` is offered as `task_create`. */
export const toolName = (actionId: string): string => actionId.replaceAll(".", "_");

const said = (text: string, ok: boolean, spec: ActionSpec, tag: string): ToolExecutionResult => ({
  output: [{ type: "text", text }],
  isError: !ok,
  details: { action: spec.id, outcome: tag },
});

const record = (value: Outcome["value"]): Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};

/** A run's conversation is made in the call's commit; its brief can only be submitted once that has committed. */
async function startRunFrom(outcome: Outcome, api: ToolExecutionApi, context: Context): Promise<void> {
  const { conversationId, brief, run } = record(outcome.value);
  if (typeof conversationId !== "number" || typeof brief !== "string" || typeof run !== "string") return;
  const conversation = await api.conversation(conversationId as ConversationId, context);
  await conversation?.submit({ type: "input", content: brief, requestId: `start:${run}` }, context);
}

/** `question.ask` is done once the item is in the Inbox; its result is the person's answer. */
async function questionStep(
  effects: ToolEffects,
  profile: ManagerProfile,
  outcome: Outcome,
  answer: Answer | undefined,
  api: ToolExecutionApi,
  context: Context,
): Promise<ToolExecutionResult | ToolPark> {
  const asked = record(outcome.value);
  const itemId = questionItemId(profile.managerId, String(asked["id"]));
  const reply = async (given: Answer) => {
    await api.commit((tx) => closeQuestion(tx, itemId), context);
    return { output: [{ type: "text" as const, text: answerWords(given) }], details: { action: "question.ask", outcome: "Answered" } };
  };
  if (answer !== undefined) return reply(answer);
  const to = typeof asked["to"] === "string" ? `email:${asked["to"].trim().toLowerCase()}` : profile.createdBy;
  const options = Array.isArray(asked["options"]) ? asked["options"].map(String) : [];
  const title = String(asked["question"]);
  const task = typeof asked["task"] === "string" ? asked["task"] : undefined;
  const detail = asDetail(asked["detail"]);
  const parked = await askAndPark(
    effects,
    profile,
    {
      id: itemId,
      kind: "question",
      to,
      title,
      options,
      ...(task === undefined ? {} : { task }),
      ...(detail === undefined ? {} : { detail }),
    },
    api,
  );
  if ("failed" in parked) return { output: [{ type: "text", text: parked.failed }], isError: true };
  return "answer" in parked ? reply(parked.answer) : parked.park;
}

/** Asks the workspace which agent `run.start` names, before the commit that makes the run. */
async function launchBefore(effects: ToolEffects, args: Record<string, unknown>, api: ToolExecutionApi, context: Context) {
  const profile = await api.commit(async (tx) => {
    const found = (await tx.doc(ProfileDoc)).profile;
    return found === undefined ? undefined : { ...found };
  }, context);
  return profile === undefined
    ? undefined
    : launchFor(effects.workspace(profile), typeof args["agent"] === "string" ? args["agent"] : undefined);
}

function actionTool(spec: ActionSpec, parameters: object, worker: Mounted, effects: ToolEffects): ToolRegistration {
  return {
    name: toolName(spec.id),
    description: `${spec.label}. (Action ${spec.id}, shown on ${spec.screen}.)`,
    parameters,
    replay: "safe",
    execute: async (args: Record<string, unknown>, api, context) => {
      let answer = api.wake?.reason === "signal" ? await answerFor(api, api.wake.key, context) : undefined;
      const launch = spec.id === "run.start" ? await launchBefore(effects, args, api, context) : undefined;
      for (;;) {
        const given = answer;
        const step = await api.commit(
          (tx) => decide(tx, { spec, args, taskId: api.taskId, now: () => api.now(), worker, answer: given, launch }),
          context,
        );
        effects.flush();
        if (step.kind === "approval") {
          const id = `approval:${step.profile.managerId}:${String(api.taskId)}`;
          const request = {
            id,
            kind: "approval" as const,
            to: step.profile.createdBy,
            title: step.sentence,
            options: [...APPROVAL_OPTIONS],
          };
          const parked = await askAndPark(effects, step.profile, request, api);
          if ("failed" in parked) return said(parked.failed, false, spec, "Failed");
          if ("park" in parked) return parked.park;
          // Answered before this call parked (a rerun after a crash): decide again with the answer.
          answer = parked.answer;
          continue;
        }
        const { outcome } = step;
        if (spec.id === "run.start" && outcome.ok) await startRunFrom(outcome, api, context);
        const stopping = spec.id === "run.stop" && outcome.ok ? stoppedConversation(outcome.value) : undefined;
        if (stopping !== undefined) await abortRun((id, within) => api.conversation(id, within), stopping);
        if (spec.id === "question.ask" && outcome.ok) return questionStep(effects, step.profile, outcome, given, api, context);
        return said(outcome.text, outcome.ok, spec, outcome.tag);
      }
    },
  };
}

/**
 * One tool per action that is built, in the catalogue's order. An action is built once it has both its input here and
 * its handler; one that is only in the book is not offered, so the manager never tries it or asks a person to allow it.
 */
export const actionTools = (worker: Mounted, effects: ToolEffects): readonly ToolRegistration[] =>
  CATALOGUE.flatMap((spec) => {
    const parameters = PARAMETERS[spec.id];
    return parameters === undefined ? [] : [actionTool(spec, parameters, worker, effects)];
  });
