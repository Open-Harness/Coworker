import { defineDoc, type ToolRegistration } from "@earendil-works/pi-durable";
import { obj, oneOf, opt, str } from "@earendil-works/pi-schema";
import type { AgentKind } from "~/modules/agent-engine/types.ts";
import type { Report } from "~/modules/board/types.ts";
import type { FileStore } from "~/modules/triggers/types.ts";
import type { ToolEffects } from "./asking.ts";
import { commandTool } from "./command.ts";
import { filesOf } from "./runs.ts";
import { readSkillTool } from "./skill-tool.ts";
import { BoardDoc, type BoardState } from "./state.ts";

/* The agent that does a Run. A saved agent is this kind with its own instructions, model, tools and skills. */

const REPORTS = ["progress", "waiting", "ready", "blocked", "failed", "dropped"] as const;
const ENDS: ReadonlySet<Report> = new Set(["ready", "failed", "dropped"]);

const Reported = defineDoc<{ done?: boolean }>({
  kind: "dt.run-report",
  version: 1,
  scope: "task",
  initial: () => ({}),
  checkpointWhen: () => false,
});

const reportTool: ToolRegistration = {
  name: "report",
  description:
    "Tell the board how your work is going: progress, waiting (on something outside), ready (for a person to review), blocked (needs a person), failed or dropped. Say what you did in the note.",
  parameters: obj({ report: oneOf(REPORTS), note: opt(str({ maxLength: 2_000 })) }),
  replay: "safe",
  execute: async (args: { report: Report; note?: string }, api, context) => {
    const known = await api.commit(async (tx) => {
      const receipt = await tx.doc(Reported, api.taskId);
      const board = await tx.doc(BoardDoc);
      const run = Object.values(board.runs).find(({ conversationId }) => conversationId === Number(api.conversationId));
      if (run === undefined) return false;
      if (receipt.done === true || run.stopped !== undefined) return true;
      run.report = args.report;
      run.reportedAt = api.now();
      if (args.note !== undefined) run.note = args.note;
      run.state = ENDS.has(args.report) ? "ended" : "running";
      receipt.done = true;
      return true;
    }, context);
    const text = known ? `Reported ${args.report}.` : "This conversation is not a run.";
    return { output: [{ type: "text", text }], isError: !known };
  },
};

/** Reads a file the run's Task came with. Other keys are not this run's to read. */
const readFileTool = (files: FileStore): ToolRegistration => ({
  name: "read_file",
  description: "Read a file attached to your task, by the key the brief lists.",
  parameters: obj({ key: str({ minLength: 1, maxLength: 500 }) }),
  replay: "safe",
  execute: async (args: { key: string }, api, context) => {
    const board = await api.commit((tx) => tx.doc(BoardDoc).then((state) => JSON.parse(JSON.stringify(state)) as BoardState), context);
    const run = Object.values(board.runs).find(({ conversationId }) => conversationId === Number(api.conversationId));
    const file = run === undefined ? undefined : filesOf(board.tasks[run.task]).find(({ key }) => key === args.key);
    const body = file === undefined ? undefined : await files.get(file.key);
    if (file === undefined || body === undefined)
      return { output: [{ type: "text", text: `There is no file ${args.key} on this task` }], isError: true };
    const text = file.type.startsWith("text/") ? new TextDecoder().decode(body) : `${file.name} is ${file.type}, ${body.byteLength} bytes`;
    return { output: [{ type: "text", text }] };
  },
});

export const worker: AgentKind<ToolEffects> = {
  name: "run",
  tools: () => [reportTool],
  chosen: (effects) => ({ read: readFileTool(effects.files), bash: commandTool(effects) }),
  skills: readSkillTool,
};
