import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import type { JsonValue } from "@earendil-works/chord/json";
import { defineDoc, type Harness, type Tx } from "@earendil-works/pi-durable";
import type { Channel, Outbound, ReplyAddress, ThreadRef } from "~/modules/triggers/types.ts";
import type { WorkspaceLink } from "../types.ts";

/*
 * What goes out after a commit: replies on a Task's Thread, and the Threads a Task now follows. Both are queued with
 * the change that made them and sent until they land; a reply's key makes a resend harmless.
 */

type Reply = { key: string; task: string; text: string; to: JsonValue; from: { address: string; name: string } };
type Follow = { key: string; task: string; threads: { kind: string; key: string }[] };

const SendsDoc = defineDoc<{ replies: Reply[]; follows: Follow[]; sent: number }>({
  kind: "dt.sends",
  version: 1,
  scope: "session",
  initial: () => ({ replies: [], follows: [], sent: 0 }),
  checkpointWhen: () => true,
});

export async function queueReply(tx: Tx, reply: Omit<Reply, "key" | "to"> & { readonly to: ReplyAddress }): Promise<string> {
  const sends = await tx.doc(SendsDoc);
  sends.sent += 1;
  const key = `reply:${reply.task}:${sends.sent}`;
  sends.replies.push({ ...reply, key, to: JSON.parse(JSON.stringify(reply.to)) as JsonValue });
  return key;
}

export async function queueFollow(tx: Tx, task: string, threads: readonly ThreadRef[]): Promise<void> {
  const sends = await tx.doc(SendsDoc);
  sends.follows.push({ key: `follow:${task}:${sends.follows.length}`, task, threads: threads.map(({ kind, key }) => ({ kind, key })) });
}

/** Sends what waits. A failure stays queued for the next commit or alarm; a reply that is gone is dropped. */
export async function flushSends(harness: Harness, managerId: string, channel: Channel, workspace: WorkspaceLink): Promise<boolean> {
  const waiting = await harness.snapshot(SendsDoc, BACKGROUND_CONTEXT);
  if (waiting === undefined || (waiting.replies.length === 0 && waiting.follows.length === 0)) return false;
  const done = new Set<string>();
  for (const follow of waiting.follows) {
    try {
      await workspace.follow(managerId, follow.task, follow.threads);
      done.add(follow.key);
    } catch {
      // Retried later.
    }
  }
  for (const reply of waiting.replies) {
    // Stored by `queueReply` from a `ReplyAddress`.
    const outbound: Outbound = {
      key: reply.key,
      from: reply.from,
      to: reply.to as unknown as ReplyAddress,
      task: reply.task,
      text: reply.text,
    };
    const sent = await channel.send(outbound).catch((error: unknown) => ({ _tag: "Failed" as const, reason: String(error) }));
    if (sent._tag !== "Failed") done.add(reply.key);
  }
  await harness.commit(async (tx) => {
    const sends = await tx.doc(SendsDoc);
    sends.replies = sends.replies.filter(({ key }) => !done.has(key));
    sends.follows = sends.follows.filter(({ key }) => !done.has(key));
  }, BACKGROUND_CONTEXT);
  return done.size < waiting.replies.length + waiting.follows.length;
}
