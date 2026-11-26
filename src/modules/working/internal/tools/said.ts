import { threads } from "~/modules/threads/service.ts";
import type { Check } from "~/modules/playbook/types.ts";
import type { Evidence } from "~/modules/work/types.ts";
import { apply } from "../events.ts";
import { ask } from "./asked.ts";
import { type Call, flag, list, object, said, text, type Tool, wrong, type Result } from "../tool.ts";

/* What an agent says to its work: what done means, what it found, what it did, and where it is stuck. */

const CHECK = object(
  {
    id: text("A short name for it."),
    says: text("What must be true."),
    by: { type: "string", enum: ["command", "agent", "person", "connector"], description: "Who looks at it." },
    run: text("The command, when it is one."),
  },
  ["id", "says", "by"],
);
const EVIDENCE = (extra: "link" | "at") =>
  object(
    {
      check: text("The id of what this shows."),
      met: flag("Is it true?"),
      says: text("What shows it."),
      [extra]: text(extra === "link" ? "Where to see it." : "Where, as file:line."),
    },
    ["check", "met", "says"],
  );

const refusal = (why: string): Result => wrong(why);

/** What the connector of the first step is asked to confirm once it has said what done means: that it was said. */
function confirms({ c, work, playbook }: Call, key: string): void {
  const kind = playbook.kinds.find((one) => one.id === work.kind);
  const step = kind?.steps[0];
  if (step === undefined || work.step !== step.id) return;
  const jobs = step.leaves
    .filter((leave) => leave.by === "connector")
    .map((leave) => ({ key: `${key}:confirm:${leave.id}`, do: "confirm" as const, check: leave.id }));
  if (jobs.length > 0) c.store.addJobs(work.id, jobs);
}

async function doneWhen(call: Call, args: unknown): Promise<Result> {
  const read = threads.read("done_when", args);
  if (read._tag === "Wrong") return wrong(read.says);
  const key = `said:${call.id}`;
  const checks: readonly Check[] = read.args.checks;
  const moved = apply(call.c, call.work.id, { key, at: call.c.clock.now(), is: "said done when", checks });
  if (moved._tag === "Refused") return refusal(moved.why);
  confirms(call, key);
  return said("Said. What done means will be on the issue before anything else is done.");
}

const byThread = (call: Call) => ({ agent: call.thread.agent, thread: call.thread.id });

async function report(call: Call, args: unknown): Promise<Result> {
  const read = threads.read("report", args);
  if (read._tag === "Wrong") return wrong(read.says);
  const at = call.c.clock.now();
  const evidence: readonly Evidence[] = threads.evidence(read.args, byThread(call), at);
  const key = `reported:${call.id}`;
  const moved = apply(call.c, call.work.id, {
    key,
    at,
    is: "reported",
    thread: call.thread.id,
    result: read.args.result,
    says: read.args.says,
    evidence,
  });
  if (moved._tag === "Refused") return refusal(moved.why);
  if (read.args.result === "done") {
    const now = call.c.store.work(call.work.id);
    if (now !== undefined && now.ended === null) call.c.store.addJobs(now.id, [{ key: `${key}:checks`, do: "run checks", step: now.step }]);
  }
  call.c.store.putThread({ ...call.thread, state: "ended", said: read.args.says });
  return { _tag: "Ends", text: "Reported." };
}

async function check(call: Call, args: unknown): Promise<Result> {
  const read = threads.read("check", args);
  if (read._tag === "Wrong") return wrong(read.says);
  const at = call.c.clock.now();
  const evidence = threads.evidence(read.args, byThread(call), at);
  const moved = apply(call.c, call.work.id, {
    key: `checked:${call.id}`,
    at,
    is: "checked",
    thread: call.thread.id,
    evidence,
    says: read.args.says,
  });
  if (moved._tag === "Refused") return refusal(moved.why);
  call.c.store.putThread({ ...call.thread, state: "ended", said: read.args.says });
  return { _tag: "Ends", text: "Checked." };
}

async function note(_: Call, args: unknown): Promise<Result> {
  const read = threads.read("note", args);
  return read._tag === "Wrong" ? wrong(read.says) : said("Noted.");
}

async function skill({ playbook }: Call, args: unknown): Promise<Result> {
  const read = threads.read("skill", args);
  if (read._tag === "Wrong") return wrong(read.says);
  const path = read.args.path ?? "SKILL.md";
  const found = playbook.skillFiles[`skills/${read.args.id}/${path}`];
  return found === undefined ? wrong(`There is no file ${path} in the skill ${read.args.id}.`) : said(found);
}

async function web(_: Call, args: unknown): Promise<Result> {
  const read = threads.read("web_read", args);
  return read._tag === "Wrong" ? wrong(read.says) : wrong("Reading a page is not available yet.");
}

export const SAID_TOOLS: readonly Tool[] = [
  {
    name: "done_when",
    description: "Say what will be true when this work is done. It is said on the issue before anything is done.",
    parameters: object({ checks: list(CHECK, "Each thing that must be true.") }, ["checks"]),
    run: doneWhen,
  },
  {
    name: "report",
    description: "Say you are finished with this step, or cannot go on, and what shows it. It ends your part of the step.",
    parameters: object(
      {
        result: { type: "string", enum: ["done", "no", "stuck"], description: "Is it done, not to be done, or are you stuck?" },
        says: text("What you did, in two lines."),
        evidence: list(EVIDENCE("link"), "What shows each thing that must be true."),
      },
      ["result", "says", "evidence"],
    ),
    run: report,
  },
  {
    name: "check",
    description: "Say, for each thing that must be true, whether it is, and what shows it. It ends your part.",
    parameters: object(
      { evidence: list(EVIDENCE("at"), "One for each thing that must be true."), says: text("What you found, in two lines.") },
      ["evidence", "says"],
    ),
    run: check,
  },
  {
    name: "note",
    description: "Keep a note for yourself, for later in this work.",
    parameters: object({ says: text("The note.") }, ["says"]),
    run: note,
  },
  {
    name: "ask",
    description: "Ask a person one question. Say what you would do.",
    parameters: object(
      {
        question: text("The question."),
        options: list(text("An answer."), "Answers to choose from."),
        best: text("Which you would choose."),
      },
      ["question"],
    ),
    run: ask,
  },
  {
    name: "skill",
    description: "Read a skill of this playbook.",
    parameters: object({ id: text("Which skill."), path: text("Which of its files; the page if left out.") }, ["id"]),
    run: skill,
  },
  { name: "web_read", description: "Read a page on the web.", parameters: object({ url: text("Its address.") }, ["url"]), run: web },
];
