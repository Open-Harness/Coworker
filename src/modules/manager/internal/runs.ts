import type { Tx } from "@earendil-works/pi-durable";
import type { By } from "~/modules/actions/types.ts";
import type { Mounted } from "~/modules/agent-engine/types.ts";
import type { FileRef } from "~/modules/triggers/types.ts";
import type { BoardState, RunRecord, TaskRecord } from "./state.ts";
import { DEFAULT_AGENT, type Launch } from "./launch.ts";

/*
 * A Run is one agent working on one Task in one role: a conversation of its own, beside the manager's. It tells the
 * board how it is going with `report`, and the task's stage follows from that.
 */

/** The files a Task came with, as `triage.accept` stored them. */
export const filesOf = (task: TaskRecord | undefined): readonly FileRef[] => (task?.files ?? []) as unknown as readonly FileRef[];

/** What the run is told first. The scripted brain recognises a run by its opening words. */
export const briefOf = (run: RunRecord, title: string, brief: string, files: readonly FileRef[] = []): string =>
  [
    `You are working as ${run.role} on ${run.task}: ${title}.`,
    brief,
    files.length === 0
      ? ""
      : `Files, read with read_file:\n${files.map(({ key, name, type }) => `- ${key} (${name}, ${type})`).join("\n")}`,
    "Run commands in your environment with run_command. When you finish or get stuck, call report.",
  ]
    .filter((line) => line !== "")
    .join("\n\n");

export type Started = { readonly run: string; readonly task: string; readonly conversationId: number; readonly brief: string };

/** What the run keeps of the saved agent behind it, so what happens to the agent later changes nothing for it. */
function savedOf(launch: Launch | undefined): Pick<RunRecord, "saved" | "model" | "modelNotice"> {
  const agent = launch?.kind === "agent" ? launch.agent : undefined;
  const notice = launch === undefined || launch.kind === "gone" ? undefined : launch.modelNotice;
  return {
    ...(agent === undefined
      ? {}
      : {
          saved: {
            version: agent.version,
            environment: agent.environment,
            skills: agent.skills.map(({ id, name, version }) => ({ id, name, version })),
          },
        }),
    ...(agent?.model == null ? {} : { model: { connectionId: agent.model.connectionId, model: agent.model.model } }),
    ...(notice === undefined ? {} : { modelNotice: notice }),
  };
}

/** Records the run and makes its conversation, in the caller's transaction. The brief is submitted after it commits. */
export async function startRun(
  tx: Tx,
  board: BoardState,
  input: { readonly task: string; readonly role: string; readonly agent?: string; readonly brief?: string },
  by: By,
  worker: Mounted,
  now: number,
  launch?: Launch,
): Promise<Started | { readonly cannot: string }> {
  const task = board.tasks[input.task.toUpperCase()];
  if (task === undefined) return { cannot: `There is no task ${input.task}` };
  if (launch?.kind === "gone") return { cannot: launch.message };
  const role = input.role.trim();
  if (role === "") return { cannot: "A run needs a role" };
  const id = `run-${Object.keys(board.runs).length + 1}`;
  const conversation = await tx.createConversation({ ownership: { kind: "ownerless" } });
  await worker.configure(tx, conversation.id, launch?.kind === "agent" ? launch.agent : undefined);
  const attempt = task.runs.filter((runId) => board.runs[runId]?.role === role).length + 1;
  const record: RunRecord = {
    id,
    task: task.id,
    role,
    agent: launch?.kind === "agent" ? launch.agent.name : (input.agent ?? DEFAULT_AGENT),
    attempt,
    state: "running",
    conversationId: Number(conversation.id),
    startedAt: now,
    startedBy: { kind: by.kind, id: by.id, name: by.name },
    ...savedOf(launch),
  };
  board.runs[id] = record;
  task.runs.push(id);
  return {
    run: id,
    task: task.id,
    conversationId: record.conversationId,
    brief: briefOf(record, task.title, input.brief ?? "", filesOf(task)),
  };
}
