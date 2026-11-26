import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import type { ConversationId, Harness } from "@earendil-works/pi-durable";
import { createActions } from "~/modules/actions/service.ts";
import type { ActionRecord, CallResult } from "~/modules/actions/types.ts";
import type { ManagerProfile, ManagerWorkspace, PersonCall } from "../types.ts";
import type { Engine } from "./engine.ts";
import { type Handled, handlersFor } from "./handlers.ts";
import { noteHistory } from "./history.ts";
import { queueAudit } from "./outbox.ts";
import { type Launch, launchFor } from "./launch.ts";
import { abortRun, stoppedConversation } from "./stop.ts";
import { ProfileDoc } from "./state.ts";

/** A run a person's button made has its conversation but nobody has told it what to do: its brief goes in once the commit has landed. */
export async function beginRun(harness: Harness, result: CallResult | undefined): Promise<boolean> {
  if (result?._tag !== "Done") return false;
  const handled = result.value as Handled;
  const made: unknown = handled.ok ? handled.value : undefined;
  if (typeof made !== "object" || made === null) return false;
  const { conversationId, brief, run } = made as { conversationId?: unknown; brief?: unknown; run?: unknown };
  if (typeof conversationId !== "number" || typeof brief !== "string" || typeof run !== "string") return false;
  const conversation = await harness.conversation(conversationId as ConversationId, BACKGROUND_CONTEXT);
  await conversation?.submit({ type: "input", content: brief, requestId: `start:${run}` }, BACKGROUND_CONTEXT);
  return true;
}

/**
 * A person's button: the same action as the manager's tool, checked against the person's preset and own changes.
 * The request id makes a double click one call.
 */
export async function actAsPerson(
  { harness, worker }: Pick<Engine, "harness" | "worker">,
  call: PersonCall,
  now: () => number,
  launch?: Launch,
): Promise<CallResult | undefined> {
  return harness.commit(async (tx) => {
    const profile = (await tx.doc(ProfileDoc)).profile;
    if (profile === undefined) return undefined;
    const audit: ActionRecord[] = [];
    const actions = createActions({
      sources: { manager: () => ({ categories: {}, actions: {} }), person: () => ({ preset: call.preset, own: call.own }) },
      handlers: handlersFor(tx, now, worker, launch),
      audit: (line) => audit.push(line),
      clock: { now },
    });
    const result = await actions.call(call.actionId, call.input, { kind: "person", id: call.by.id, name: call.by.name }, call.approvedBy);
    const handled = result._tag === "Done" ? (result.value as Handled) : undefined;
    if (handled?.ok === true) await noteHistory(tx, audit, handled.value);
    await queueAudit(tx, profile.managerId, `${profile.managerId}:person:${call.requestId}`, audit);
    return JSON.parse(JSON.stringify(result)) as CallResult;
  }, BACKGROUND_CONTEXT);
}

/**
 * A person's button as the object runs it. `run.start` first asks the workspace which agent is meant, and once it has
 * committed the run is told what to do.
 */
export async function press(
  engine: Pick<Engine, "harness" | "worker" | "expectWork">,
  call: PersonCall,
  now: () => number,
  workspace: (profile: ManagerProfile) => ManagerWorkspace,
): Promise<CallResult | undefined> {
  if (call.actionId === "run.stop") {
    const stopped = await actAsPerson(engine, call, now);
    const handled = stopped?._tag === "Done" ? (stopped.value as Handled) : undefined;
    const conversationId = handled?.ok === true ? stoppedConversation(handled.value) : undefined;
    if (conversationId !== undefined) await abortRun((id, context) => engine.harness.conversation(id, context), conversationId);
    return stopped;
  }
  if (call.actionId !== "run.start") return actAsPerson(engine, call, now);
  const profile = (await engine.harness.snapshot(ProfileDoc, BACKGROUND_CONTEXT))?.profile;
  const agent = call.input["agent"];
  const launch = profile === undefined ? undefined : await launchFor(workspace(profile), typeof agent === "string" ? agent : undefined);
  await engine.expectWork();
  const result = await actAsPerson(engine, call, now, launch);
  await beginRun(engine.harness, result);
  return result;
}
