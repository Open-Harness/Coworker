import type { Tx } from "@earendil-works/pi-durable";
import type { By, Handler } from "~/modules/actions/types.ts";
import type { ReplyAddress } from "~/modules/triggers/types.ts";
import { HeardDoc, triggerOf } from "./heard.ts";
import { queueFollow, queueReply } from "./sends.ts";
import { BoardDoc, type BoardState, ProfileDoc } from "./state.ts";

/*
 * Triage turns a candidate into work (model.md "The flow", steps 5 and 6) and `reply.thread` answers where the work
 * came from. Every Decision is kept with its Trigger.
 */

type Handled = { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly message: string };
type CreateTask = (board: BoardState, input: Readonly<Record<string, unknown>>, by: By, now: number) => Handled;

const done = (value: unknown): Handled => ({ ok: true, value });
const cannot = (message: string): Handled => ({ ok: false, message });
const text = (input: Readonly<Record<string, unknown>>, key: string): string | undefined =>
  typeof input[key] === "string" && input[key].trim() !== "" ? input[key].trim() : undefined;
const taskId = (name: string | undefined): string | undefined => {
  const number = /^(?:dt-)?(\d+)$/iu.exec(name ?? "")?.[1];
  return number === undefined ? undefined : `DT-${number}`;
};

export function triageHandlers(tx: Tx, now: () => number, createTask: CreateTask): Readonly<Record<string, Handler>> {
  const undecided = async (input: Readonly<Record<string, unknown>>) => {
    const id = text(input, "trigger") ?? "";
    const record = (await tx.doc(HeardDoc)).triggers[id];
    if (record === undefined) return { cannot: `There is no trigger ${id}` } as const;
    if (record.decision !== undefined) return { cannot: `Trigger ${id} was already triaged: ${record.decision.kind}` } as const;
    return { record } as const;
  };
  return {
    "triage.accept": async (input, by) => {
      const found = await undecided(input);
      if ("cannot" in found) return cannot(found.cannot);
      const trigger = triggerOf(found.record);
      const board = await tx.doc(BoardDoc);
      const created = createTask(board, { ...input, title: text(input, "title") ?? trigger.title, description: trigger.text }, by, now());
      if (!created.ok) return created;
      const task = (created.value as { task: string }).task;
      const record = board.tasks[task];
      if (record === undefined) return cannot(`Task ${task} was not made`);
      const strength = (found.record.routed as { strength?: "explicit" | "inferred" }).strength ?? "explicit";
      record.mandate = { trigger: trigger.id, strength, source: trigger.source, sender: trigger.actor.id };
      record.replyTo = JSON.parse(JSON.stringify(trigger.replyTo));
      if (trigger.attachments.length > 0) record.files = JSON.parse(JSON.stringify(trigger.attachments));
      found.record.decision = { kind: "accept", task };
      await queueFollow(tx, task, trigger.threads);
      return done({ task, title: record.title, trigger: trigger.id });
    },
    "triage.attach": async (input) => {
      const found = await undecided(input);
      if ("cannot" in found) return cannot(found.cannot);
      const task = taskId(text(input, "task"));
      if (task === undefined || (await tx.doc(BoardDoc)).tasks[task] === undefined)
        return cannot(`There is no task ${String(input["task"])}`);
      found.record.decision = { kind: "attach", task };
      await queueFollow(tx, task, triggerOf(found.record).threads);
      return done({ task, trigger: triggerOf(found.record).id });
    },
    "triage.ignore": async (input) => {
      const found = await undecided(input);
      if ("cannot" in found) return cannot(found.cannot);
      const reason = text(input, "reason") ?? "Not work";
      found.record.decision = { kind: "ignore", reason, wouldAccept: input["wouldAccept"] === true };
      return done({ ignored: triggerOf(found.record).id, reason });
    },
    "reply.thread": async (input) => {
      const task = (await tx.doc(BoardDoc)).tasks[taskId(text(input, "task")) ?? ""];
      if (task === undefined) return cannot(`There is no task ${String(input["task"])}`);
      if (task.replyTo === undefined) return cannot(`${task.id} did not come from outside, so there is no thread to answer`);
      const words = text(input, "text");
      if (words === undefined) return cannot("A reply needs words");
      const profile = (await tx.doc(ProfileDoc)).profile;
      if (profile === undefined) return cannot("The manager is not set up");
      const to = task.replyTo as unknown as ReplyAddress;
      const key = await queueReply(tx, { task: task.id, text: words, to, from: { address: profile.address, name: profile.name } });
      return done({ queued: key, task: task.id });
    },
  };
}
