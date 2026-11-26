import type { Step, Turn } from "../types.ts";

const say = (text: string): Step => ({ kind: "say", text });
const call = (tool: string, args: Readonly<Record<string, unknown>>): Step => ({ kind: "call", tool, args });

/** The person's words, without the `[Name]` line the manager reads first. */
const stripName = (text: string): string => text.replace(/^\[[^\]]*\]\n/u, "");

/** What reached the manager from outside: accept an explicit candidate, ignore an inferred one, answer a follow-up. */
function fromOutside(prompt: string): Step | undefined {
  const candidate = /^Candidate \((explicit|inferred)\), .*Trigger: (\S+)/u.exec(prompt);
  if (candidate?.[1] === "explicit" && candidate[2] !== undefined) return call("triage_accept", { trigger: candidate[2] });
  if (candidate?.[2] !== undefined) {
    return call("triage_ignore", { trigger: candidate[2], reason: "Nobody asked for it", wouldAccept: true });
  }
  const followUp = /^Follow-up on (DT-\d+)/u.exec(prompt)?.[1];
  return followUp === undefined ? undefined : call("reply_thread", { task: followUp, text: `Thanks, I added that to ${followUp}.` });
}

/** After a tool ran: a new Task is announced where it came from; anything else is thanked in words. */
function afterTool(result: string): Step {
  const accepted = /"task":"(DT-\d+)","title":"([^"]*)"/u.exec(result);
  if (accepted?.[1] === undefined) return say(`Done. ${result.slice(0, 160)}`);
  return call("reply_thread", {
    task: accepted[1],
    text: `Got it. This is ${accepted[1]}: ${accepted[2] ?? ""}. I will reply here when it is done.`,
  });
}

/** A person typing to the manager: "add a task: <title>", "start a <role> on DT-n ...", or anything else, acknowledged. */
function typed(prompt: string): Step {
  const title = /\badd (?:a )?task:?\s+(.+)$/isu.exec(prompt)?.[1]?.trim();
  if (title !== undefined) return call("task_create", { title });
  const start = /\bstart (?:a |an )?([\w-]+) on (DT-\d+)\s*(.*)$/isu.exec(prompt);
  if (start?.[1] !== undefined && start[2] !== undefined)
    return call("run_start", { task: start[2], role: start[1], brief: (start[3] ?? "").trim() });
  return say(`Noted: ${prompt.slice(0, 200)}`);
}

/**
 * A worker's run (its first message starts "You are working as"): run the command its brief names, if any, and report
 * how it went with the end of what it printed; with no command, report ready.
 */
function inRun(turns: readonly Turn[]): Step {
  const last = turns.at(-1);
  if (last?.role === "tool" && last.tool === "run_command") {
    const ok = /^Exit 0\b/u.test(last.text);
    return call("report", { report: ok ? "ready" : "failed", note: `Ran it. ${last.text.slice(-400)}` });
  }
  if (last?.role === "tool") return say("Finished.");
  const command = /\brun: (.+)$/mu.exec(turns.find(({ role }) => role === "user")?.text ?? "")?.[1];
  return command === undefined
    ? call("report", { report: "ready", note: "Done by coworker-fake-model" })
    : call("run_command", { command });
}

/**
 * The next step for a conversation. `tools` are the names the caller offered: a step that needs a tool it did not
 * offer becomes a sentence instead, so the script never asks for what does not exist.
 */
export function nextStep(turns: readonly Turn[], tools: readonly string[]): Step {
  const first = turns.find(({ role }) => role === "user")?.text ?? "";
  const last = turns.at(-1);
  const prompt = stripName(turns.findLast(({ role }) => role === "user")?.text ?? "");
  const step: Step = first.startsWith("You are working as ")
    ? inRun(turns)
    : last?.role === "tool"
      ? afterTool(last.text)
      : (fromOutside(prompt) ?? typed(prompt));
  return step.kind === "call" && !tools.includes(step.tool) ? say(`I would use ${step.tool}, but it is not offered.`) : step;
}
