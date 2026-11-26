import type { JsonValue } from "@earendil-works/chord/json";
import { defineDoc, type TaskId, type Tx } from "@earendil-works/pi-durable";
import { createActions } from "~/modules/actions/service.ts";
import type { ActionRecord, ActionSpec, By, CallResult } from "~/modules/actions/types.ts";
import type { Mounted } from "~/modules/agent-engine/types.ts";
import type { Answer, ManagerProfile } from "../types.ts";
import { type Handled, handlersFor } from "./handlers.ts";
import { noteHistory } from "./history.ts";
import { queueAudit } from "./outbox.ts";
import { DEFAULT_AGENT, type Launch } from "./launch.ts";
import { PermissionsDoc, ProfileDoc, QuestionsDoc } from "./state.ts";

export type Outcome = { tag: CallResult["_tag"]; text: string; ok: boolean; value?: JsonValue };

/** What one call did, kept with the call so a rerun after a crash answers the same without acting again. */
const Receipt = defineDoc<{ outcome?: Outcome }>({
  kind: "dt.action-receipt",
  version: 2,
  scope: "task",
  initial: () => ({}),
  migrate: () => ({}),
  checkpointWhen: () => false,
});

const json = (value: unknown): JsonValue => JSON.parse(JSON.stringify(value ?? null)) as JsonValue;

function outcomeOf(result: CallResult): Outcome {
  switch (result._tag) {
    case "Done": {
      const handled = result.value as Handled;
      return handled.ok
        ? { tag: "Done", ok: true, text: JSON.stringify(handled.value), value: json(handled.value) }
        : { tag: "Done", ok: false, text: handled.message };
    }
    case "Refused":
      return { tag: "Refused", ok: false, text: `Refused: ${result.reason}` };
    case "Ask":
      return { tag: "Ask", ok: false, text: result.sentence };
    case "Failed":
      return { tag: "Failed", ok: false, text: result.message };
    case "Unknown":
      return { tag: "Unknown", ok: false, text: `There is no action ${result.action}` };
  }
}

/** What the tool does once the commit is in: answer, or ask a person first. */
export type Step =
  | { readonly kind: "result"; readonly outcome: Outcome; readonly profile: ManagerProfile }
  | { readonly kind: "approval"; readonly sentence: string; readonly profile: ManagerProfile };

export interface CallInput {
  readonly spec: ActionSpec;
  readonly args: Readonly<Record<string, unknown>>;
  readonly taskId: TaskId;
  readonly now: () => number;
  readonly worker: Mounted;
  /** The approval or answer this call parked for, once it has come. */
  readonly answer: Answer | undefined;
  /** For `run.start`: the saved agent and model notice, found out before the commit. */
  readonly launch?: Launch | undefined;
}

const refusal = (spec: ActionSpec, sentence: string, by: By, at: number): ActionRecord => ({
  action: spec.id,
  input: {},
  by,
  at,
  permission: "ask",
  sentence,
  outcome: "refused",
});

/** What a call left out, as it is acted on, so its sentence and its record name the same agent and person. */
function filled(spec: ActionSpec, args: CallInput["args"], profile: ManagerProfile): CallInput["args"] {
  if (spec.id === "run.start") return { ...args, agent: args["agent"] ?? DEFAULT_AGENT };
  const owner = /^email:(.+)$/u.exec(profile.createdBy)?.[1];
  if (spec.id === "question.ask" && owner !== undefined) return { ...args, to: args["to"] ?? owner };
  return args;
}

/** Inside the call's commit: check, act, record. An action set to ask asks first; nothing is recorded until it runs. */
export async function decide(tx: Tx, call: CallInput): Promise<Step> {
  const { spec, taskId, now, answer } = call;
  const receipt = await tx.doc(Receipt, taskId);
  const profile = (await tx.doc(ProfileDoc)).profile;
  if (profile === undefined) throw new Error("A tool ran in a manager nobody set up");
  if (receipt.outcome !== undefined) return { kind: "result", outcome: json(receipt.outcome) as Outcome, profile: { ...profile } };
  const args = filled(spec, call.args, profile);
  const own = await tx.doc(PermissionsDoc);
  const by: By = { kind: "manager", id: profile.managerId, name: profile.name };
  const audit: ActionRecord[] = [];
  const actions = createActions({
    sources: { manager: () => own, person: () => undefined },
    handlers: handlersFor(tx, now, call.worker, call.launch),
    audit: (line) => audit.push(line),
    clock: { now },
  });
  let outcome: Outcome;
  if (answer !== undefined && answer.decision !== "allow" && answer.decision !== "always") {
    const sentence = actions.describe(spec.id, args, by);
    audit.push({ ...refusal(spec, sentence, by, now()), input: args, approvedBy: answer.byId });
    const said = answer.decision === "text" ? ` and said: ${answer.text}` : "";
    outcome = { tag: "Refused", ok: false, text: `Refused: ${answer.byName} did not allow "${sentence}"${said}` };
  } else {
    if (answer?.decision === "always") own.actions[spec.id] = "on";
    outcome = outcomeOf(await actions.call(spec.id, args, by, answer?.byId));
    if (outcome.tag === "Ask") return { kind: "approval", sentence: outcome.text, profile: { ...profile } };
    // The manager widening itself is the manager's act and a person's yes: the line names both.
    if (spec.id === "self.permissions" && answer !== undefined) {
      for (const [index, line] of audit.entries()) audit[index] = { ...line, sentence: `${line.sentence}, allowed by ${answer.byName}` };
    }
  }
  if (spec.id === "question.ask" && outcome.ok) await noteQuestion(tx, profile.managerId, outcome.value);
  if (outcome.ok) await noteHistory(tx, audit, outcome.value);
  receipt.outcome = outcome;
  await queueAudit(tx, profile.managerId, `${profile.managerId}:${taskId}`, audit);
  return { kind: "result", outcome, profile: { ...profile } };
}

export const questionItemId = (managerId: string, id: string): string => `question:${managerId}:${id}`;

async function noteQuestion(tx: Tx, managerId: string, value: JsonValue | undefined): Promise<void> {
  if (typeof value !== "object" || value === null || Array.isArray(value) || typeof value["id"] !== "string") return;
  const questions = await tx.doc(QuestionsDoc);
  const id = questionItemId(managerId, value["id"]);
  questions.items[id] ??= { task: typeof value["task"] === "string" ? value["task"] : null, open: true };
}

/** A question answered closes, so its task stops waiting on a person. */
export async function closeQuestion(tx: Tx, itemId: string): Promise<void> {
  const item = (await tx.doc(QuestionsDoc)).items[itemId];
  if (item !== undefined) item.open = false;
}
