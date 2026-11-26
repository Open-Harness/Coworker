import { fauxAssistantMessage, fauxProvider, type FauxResponseFactory, fauxText, fauxToolCall } from "@earendil-works/pi-ai";
import { createModels } from "@earendil-works/pi-ai/models";
import { decideArgs, longAnswer, slug, stepsFor, stopCall } from "./internal/phrases.ts";
import type { Brain } from "./types.ts";

/*
 * The fast tier's manager model. It needs no key and turns a few phrases into the action a real model would choose:
 * "add a task: <title>", "move DT-1 to <lane>", "update the mission: <text>", "add a page <title>: <body>",
 * "start a <role> on DT-1 <brief>", "delete DT-1", "add a lane: <name>", "set DT-1 <field> to <value>",
 * "comment on DT-1: <text>", "ask me: <question>" (asking again if the answer is unclear), "stop run-1", "write at length" (a long answer,
 * a few seconds in the writing), "ask me to decide on DT-1: <question>? <A> | <B> | <C>" (a question with context, facts,
 * choices and links). From outside: an explicit candidate is accepted and answered, an inferred one recorded as "would
 * accept", a follow-up answered on its Task. A run reports ready, or blocked when its brief says so, or "slowly" ready
 * ("keeps going": minutes later); one with files reads the first, then reports; one told "run: <command>" runs it.
 */

type Context = Parameters<FauxResponseFactory>[0];

/** The tool names the scripted model was last offered. Shared by the Worker and the tests in one isolate. */
export const offered: { names: readonly string[]; system?: string } = { names: [] };

/** What each run's first model call was given: its role, system prompt and tools. Shared by the Worker and the tests. */
export const runsSeen: { role: string; system: string; tools: readonly string[] }[] = [];

const QUEUE_LOW = 20;

const partsText = (content: unknown): string =>
  typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map((part: unknown) => (typeof part === "object" && part !== null && "text" in part ? String(part.text) : "")).join("\n")
      : "";

/** The person's words, without the `[Name]` line the manager reads first. */
const promptOf = (context: Context): string =>
  partsText(context.messages.findLast(({ role }) => role === "user")?.content).replace(/^\[[^\]]*\]\n/u, "");

function callFor(prompt: string, seed: string) {
  const id = { id: `call-${seed}` };
  const task = /\badd (?:a )?task:?\s+(.+)$/isu.exec(prompt)?.[1];
  if (task !== undefined) return fauxToolCall("task_create", { title: task.trim() }, id);
  const move = /\bmove (DT-\d+) to (.+)$/iu.exec(prompt);
  if (move?.[1] !== undefined && move[2] !== undefined) return fauxToolCall("task_move", { task: move[1], lane: move[2].trim() }, id);
  const mission = /\bupdate the mission:\s*(.+)$/isu.exec(prompt)?.[1];
  if (mission !== undefined) return fauxToolCall("mission_update", { body: mission.trim() }, id);
  const page = /\badd (?:a )?page ([^:]+):\s*(.+)$/isu.exec(prompt);
  if (page?.[1] !== undefined && page[2] !== undefined)
    return fauxToolCall("page_create", { title: page[1].trim(), body: page[2].trim() }, id);
  const newLane = /\badd (?:a )?lane:?\s+(.+)$/iu.exec(prompt)?.[1];
  if (newLane !== undefined) return fauxToolCall("lane_create", { name: newLane.trim() }, id);
  const value = /\bset (DT-\d+) (\w+) to (.+)$/iu.exec(prompt);
  if (value?.[1] !== undefined && value[2] !== undefined && value[3] !== undefined)
    return fauxToolCall("task_values", { task: value[1], values: { [value[2]]: value[3].trim() } }, id);
  const note = /\bcomment on (DT-\d+):\s*(.+)$/isu.exec(prompt);
  if (note?.[1] !== undefined && note[2] !== undefined) return fauxToolCall("task_comment", { task: note[1], text: note[2].trim() }, id);
  const own = /\bchange my permissions: ([\w.]+) (on|off|ask)\b/iu.exec(prompt);
  if (own?.[1] !== undefined && own[2] !== undefined) return fauxToolCall("self_permissions", { actions: { [own[1]]: own[2] } }, id);
  const remove = /\bdelete (DT-\d+)/iu.exec(prompt)?.[1];
  if (remove !== undefined) return fauxToolCall("task_delete", { task: remove }, id);
  const heard = heardCall(prompt, id);
  if (heard !== undefined) return heard;
  const decide = /\bask me to decide on (DT-\d+):\s*([^?]+\?)\s*(.+)$/isu.exec(prompt);
  if (decide?.[1] !== undefined && decide[2] !== undefined && decide[3] !== undefined) {
    const options = decide[3].split(" | ").map((option) => option.trim());
    return fauxToolCall("question_ask", decideArgs(decide[1], decide[2].trim(), options), id);
  }
  const question = /\bask me:\s*(.+)$/isu.exec(prompt)?.[1]?.trim();
  if (question !== undefined) return fauxToolCall("question_ask", { id: slug(question), question }, id);
  const stop = stopCall(prompt, id);
  if (stop !== undefined) return stop;
  const start = /\bstart (?:a |an )?([\w-]+) on (DT-\d+)\s*(.*)$/isu.exec(prompt);
  if (start?.[1] !== undefined && start[2] !== undefined) {
    return fauxToolCall("run_start", { task: start[2], role: start[1], brief: (start[3] ?? "").trim() }, id);
  }
  return undefined;
}

/** What reached the manager from outside: accept an explicit candidate, record an inferred one, answer a follow-up. */
function heardCall(prompt: string, id: { readonly id: string }) {
  const candidate = /^Candidate \((explicit|inferred)\), .*Trigger: (\S+)/u.exec(prompt);
  if (candidate?.[1] === "explicit" && candidate[2] !== undefined) return fauxToolCall("triage_accept", { trigger: candidate[2] }, id);
  if (candidate?.[2] !== undefined) {
    return fauxToolCall(
      "triage_ignore",
      { trigger: candidate[2], reason: "Nobody asked for it; observe mode records it", wouldAccept: true },
      id,
    );
  }
  const followUp = /^Follow-up on (DT-\d+)/u.exec(prompt)?.[1];
  if (followUp !== undefined) return fauxToolCall("reply_thread", { task: followUp, text: `Thanks, I added that to ${followUp}.` }, id);
  return undefined;
}

/** Once a candidate is a task, say so where it came from. */
function afterAccept(text: string, seed: string) {
  const accepted = /"task":"(DT-\d+)","title":"([^"]*)"/u.exec(text);
  if (accepted?.[1] === undefined) return fauxAssistantMessage(`Done. ${text}`);
  const reply = { task: accepted[1], text: `Got it. This is ${accepted[1]}: ${accepted[2] ?? ""}. I will reply here when it is done.` };
  return fauxAssistantMessage([fauxToolCall("reply_thread", reply, { id: `call-${seed}` })], { stopReason: "toolUse" });
}

/** A run's script: report ready, or blocked, or report progress and then take a long while before ready. */
function runAnswer(context: Context, brief: string) {
  const seed = { id: `report-${context.messages.length}` };
  const last = context.messages.at(-1);
  if (!context.messages.some(({ role }) => role === "assistant"))
    runsSeen.push({
      role: /^You are working as (\S+)/u.exec(brief)?.[1] ?? "",
      system: systemOf(context),
      tools: toolsOffered(context),
    });
  if (last?.role === "toolResult" && last.toolName === "read_skill") {
    const note = `Read the skill: ${partsText(last.content).slice(0, 200)}`;
    return fauxAssistantMessage([fauxToolCall("report", { report: last.isError === true ? "failed" : "ready", note }, seed)], {
      stopReason: "toolUse",
    });
  }
  const skill = /\bread skill: (\S+)(?: (\S+))?/u.exec(brief);
  if (skill?.[1] !== undefined && last?.role !== "toolResult") {
    const args = { skill: skill[1], ...(skill[2] === undefined ? {} : { path: skill[2] }) };
    return fauxAssistantMessage([fauxToolCall("read_skill", args, seed)], { stopReason: "toolUse" });
  }
  if (last?.role === "toolResult" && last.toolName === "read_file") {
    const note = `Read the file: ${partsText(last.content).slice(0, 80)}`;
    return fauxAssistantMessage([fauxToolCall("report", { report: "ready", note }, seed)], { stopReason: "toolUse" });
  }
  if (last?.role === "toolResult" && last.toolName === "run_command") {
    const report = last.isError === true ? "failed" : "ready";
    return fauxAssistantMessage([fauxToolCall("report", { report, note: `Ran it. ${partsText(last.content).slice(0, 200)}` }, seed)], {
      stopReason: "toolUse",
    });
  }
  const command = /\brun: (.+)$/mu.exec(brief)?.[1];
  if (command !== undefined && last?.role !== "toolResult")
    return fauxAssistantMessage([fauxToolCall("run_command", { command }, seed)], { stopReason: "toolUse" });
  const file = /^- (\S+) \(/mu.exec(brief)?.[1];
  if (file !== undefined && last?.role !== "toolResult")
    return fauxAssistantMessage([fauxToolCall("read_file", { key: file }, seed)], { stopReason: "toolUse" });
  if (last?.role === "toolResult") {
    if (stepsFor(brief) > 0 && partsText(last.content).includes("progress")) {
      return fauxAssistantMessage(
        [
          fauxText(`Working through it. ${"Step after step. ".repeat(stepsFor(brief))}`),
          fauxToolCall("report", { report: "ready", note: "Done slowly" }, seed),
        ],
        {
          stopReason: "toolUse",
        },
      );
    }
    return fauxAssistantMessage("Finished.");
  }
  if (stepsFor(brief) > 0)
    return fauxAssistantMessage([fauxToolCall("report", { report: "progress", note: "Started" }, seed)], { stopReason: "toolUse" });
  const report = /\bblocked\b/iu.test(brief) ? "blocked" : "ready";
  return fauxAssistantMessage([fauxText("Drafted it."), fauxToolCall("report", { report, note: `Reported ${report}` }, seed)], {
    stopReason: "toolUse",
  });
}

/** An answer that does not say what was asked is asked again, once, more plainly. */
function afterQuestion(context: Context, text: string) {
  const unclear = /\b(not sure|maybe|dunno)\b|\?\s*$/iu.test(text);
  if (!unclear) return fauxAssistantMessage(`Got it: ${text.replace(/^.*? answered: /u, "")}`);
  const asked = context.messages.flatMap((message) =>
    message.role === "assistant"
      ? message.content.flatMap((part) => (part.type === "toolCall" && part.name === "question_ask" ? [part] : []))
      : [],
  );
  const id = `${String(asked.at(-1)?.arguments["id"] ?? "question")}-again`;
  const call = fauxToolCall("question_ask", { id, question: "Could you give me one day?" }, { id: `call-${context.messages.length}` });
  return fauxAssistantMessage([fauxText("That is not clear yet."), call], { stopReason: "toolUse" });
}

/** Everything the model's system messages say: their text and their named sections, as of the last of each. */
function systemOf(context: Context): string {
  const sections = new Map<string, string>();
  const texts: string[] = [];
  for (const message of context.messages) {
    if (message.role !== "system") continue;
    texts.push(partsText(message.content));
    for (const [name, text] of Object.entries(message.sections ?? {})) {
      if (text === null) sections.delete(name);
      else sections.set(name, text);
    }
  }
  return [...texts, ...sections.values()].join("\n");
}

/** Tools reach a model through system messages that add and remove them, in order. */
function toolsOffered(context: Context): readonly string[] {
  const names = new Set<string>();
  for (const message of context.messages) {
    if (message.role !== "system") continue;
    for (const { name } of message.toolsRemoved ?? []) names.delete(name);
    for (const { name } of message.toolsAdded ?? []) names.add(name);
  }
  return [...names];
}

function answer(context: Context) {
  const first = partsText(context.messages.find(({ role }) => role === "user")?.content);
  if (first.startsWith("You are working as ")) return runAnswer(context, first);
  offered.names = toolsOffered(context);
  offered.system = systemOf(context);
  const last = context.messages.at(-1);
  if (last?.role === "toolResult") {
    const text = partsText(last.content).slice(0, 300);
    if (last.toolName === "question_ask" && !last.isError) return afterQuestion(context, text);
    if (last.toolName === "triage_accept" && !last.isError) return afterAccept(text, String(context.messages.length));
    return fauxAssistantMessage(last.isError ? `That did not work: ${text}` : `Done. ${text}`);
  }
  if (/\bwrite at length\b/iu.test(promptOf(context))) return fauxAssistantMessage(longAnswer());
  const call = callFor(promptOf(context), String(context.messages.length));
  if (call !== undefined) return fauxAssistantMessage([fauxText("On it."), call], { stopReason: "toolUse" });
  return fauxAssistantMessage(`Noted: ${promptOf(context)}`);
}

/** A manager's brain that follows the script above. */
export function scriptedBrain(): Brain {
  // Fast enough for tests, slow enough that a long answer can be interrupted.
  const faux = fauxProvider({ provider: "scripted", models: [{ id: "manager", name: "Scripted manager" }], tokensPerSecond: 4_000 });
  const respond: FauxResponseFactory = (context) => {
    if (faux.getPendingResponseCount() < QUEUE_LOW) faux.appendResponses([respond]);
    return answer(context);
  };
  faux.setResponses(Array.from({ length: QUEUE_LOW }, () => respond));
  const models = createModels({ authContext: { env: async () => "unused", fileExists: async () => false } });
  models.setProvider(faux.provider);
  return { models, model: { provider: "scripted", modelId: "manager" } };
}
