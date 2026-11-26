import type { JsonValue } from "@earendil-works/chord/json";
import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { defineDoc, type Harness, type Tx } from "@earendil-works/pi-durable";
import type { ActionRecord } from "~/modules/actions/types.ts";
import type { AuditLine, WorkspaceLink } from "../types.ts";

/*
 * Audit lines are written with the change they describe, in the Manager object, then sent to the Workspace object's
 * log. Sending is retried until it lands; the key makes a resend harmless.
 */

type Pending = { key: string; managerId: string; record: JsonValue };

const AuditOutbox = defineDoc<{ lines: Pending[] }>({
  kind: "dt.audit-outbox",
  version: 1,
  scope: "session",
  initial: () => ({ lines: [] }),
  checkpointWhen: () => true,
});

const json = (value: unknown): JsonValue => JSON.parse(JSON.stringify(value ?? null)) as JsonValue;

export async function queueAudit(tx: Tx, managerId: string, key: string, records: readonly ActionRecord[]): Promise<void> {
  const outbox = await tx.doc(AuditOutbox);
  for (const [index, record] of records.entries()) outbox.lines.push({ key: `${key}:${index}`, managerId, record: json(record) });
}

/** Sends what is waiting. A failure leaves it queued for the next commit or alarm. */
export async function flushAudit(harness: Harness, workspace: WorkspaceLink | undefined): Promise<void> {
  if (workspace === undefined) return;
  const waiting = (await harness.snapshot(AuditOutbox, BACKGROUND_CONTEXT))?.lines ?? [];
  if (waiting.length === 0) return;
  // Written by this object's own commits, in the shape `queueAudit` stores.
  const lines = waiting.map(
    (line) => ({ key: line.key, managerId: line.managerId, record: line.record as unknown as ActionRecord }) satisfies AuditLine,
  );
  try {
    await workspace.recordActions(lines);
  } catch {
    return;
  }
  const sent = new Set(lines.map(({ key }) => key));
  await harness.commit(async (tx) => {
    const outbox = await tx.doc(AuditOutbox);
    outbox.lines = outbox.lines.filter(({ key }) => !sent.has(key));
  }, BACKGROUND_CONTEXT);
}

export const hasPending = async (harness: Harness): Promise<boolean> =>
  ((await harness.snapshot(AuditOutbox, BACKGROUND_CONTEXT))?.lines.length ?? 0) > 0;
