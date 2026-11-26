import type { JsonValue } from "@earendil-works/chord/json";
import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { defineDoc, type Harness } from "@earendil-works/pi-durable";
import type { Trigger } from "~/modules/triggers/types.ts";
import type { Heard, TriggerDecision } from "../types.ts";

/*
 * What the Workspace handed this manager: candidates waiting for triage, and follow-ups on its Tasks. Each is kept by
 * its Trigger id with the Decision taken on it, and submitted to the manager's conversation once.
 */

export type Decision = { kind: "accept" | "attach"; task: string } | { kind: "ignore"; reason: string; wouldAccept: boolean };
export type HeardRecord = { trigger: JsonValue; routed: JsonValue; decision?: Decision };

export const HeardDoc = defineDoc<{ triggers: { [id: string]: HeardRecord } }>({
  kind: "dt.heard",
  version: 1,
  scope: "session",
  initial: () => ({ triggers: {} }),
  checkpointWhen: (_value, ops) => ops.length > 20,
});

const json = (value: unknown): JsonValue => JSON.parse(JSON.stringify(value)) as JsonValue;

/** Stored by `hear` from a `Trigger`, so it reads back as one. */
export const triggerOf = (record: HeardRecord): Trigger => record.trigger as unknown as Trigger;

const sender = (trigger: Trigger): string => `${trigger.source} from ${trigger.actor.display ?? trigger.actor.id}`;

/** What the manager reads. Its first words say what it is; the scripted model reads them too. */
export function heardText(trigger: Trigger, routed: Heard): string {
  const head =
    routed._tag === "FollowUp"
      ? `Follow-up on ${routed.task}, ${sender(trigger)}.`
      : `Candidate (${routed.strength}), ${sender(trigger)}. Trigger: ${trigger.id}`;
  const files = trigger.attachments.map(({ name, type, size }) => `Attached: ${name} (${type}, ${size} bytes)`);
  return [head, `Subject: ${trigger.title}`, trigger.text, ...files].filter((part) => part !== "").join("\n\n");
}

/** Every Decision taken so far, for the Events screen. */
export function decisionsOf(heard: { readonly triggers: { readonly [id: string]: HeardRecord } } | undefined): readonly TriggerDecision[] {
  return Object.entries(heard?.triggers ?? {}).flatMap(([trigger, { decision }]): TriggerDecision[] => {
    if (decision === undefined) return [];
    return decision.kind === "ignore"
      ? [{ trigger, kind: "ignore", reason: decision.reason, wouldAccept: decision.wouldAccept }]
      : [{ trigger, kind: decision.kind, task: decision.task }];
  });
}

/** Keeps the Trigger and gives it to the manager's conversation, once by its id. */
export async function hear(harness: Harness, trigger: Trigger, routed: Heard): Promise<void> {
  await harness.commit(async (tx) => {
    const heard = await tx.doc(HeardDoc);
    heard.triggers[trigger.id] ??= { trigger: json(trigger), routed: json(routed) };
  }, BACKGROUND_CONTEXT);
  const root = await harness.root(BACKGROUND_CONTEXT);
  await root.submit(
    { type: "input", content: heardText(trigger, routed), requestId: `trigger:${trigger.id}`, whenBusy: "followUp" },
    BACKGROUND_CONTEXT,
  );
}
