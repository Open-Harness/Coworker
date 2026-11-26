import type { Report, StageView, TaskFacts } from "../types.ts";

const LABELS = {
  "person.answer": "Needs your answer",
  "person.review": "Needs your review",
  "person.blocked": "Blocked",
  queued: "Queued",
  idle: "Waiting for something",
  working: "Working",
} as const;

const view = (stage: keyof typeof LABELS): StageView => ({ stage, label: LABELS[stage] });

/** The latest report of any run, with when it came. */
function latestReport(facts: TaskFacts): { readonly report: Report; readonly at: number } | undefined {
  let latest: { report: Report; at: number } | undefined;
  for (const [index, run] of facts.runs.entries()) {
    if (run.report === undefined) continue;
    const at = run.reportedAt ?? index;
    if (latest === undefined || at >= latest.at) latest = { report: run.report, at };
  }
  return latest;
}

export function stageOf(facts: TaskFacts): StageView {
  if (facts.openQuestions > 0) return view("person.answer");
  const latest = latestReport(facts);
  if (latest?.report === "ready") return view("person.review");
  const blocking = latest?.report === "blocked" || latest?.report === "failed";
  if (blocking && (facts.lastPersonWriteAt === undefined || facts.lastPersonWriteAt < latest.at)) return view("person.blocked");
  if (facts.runs.every((run) => run.state === "queued")) return view("queued");
  if (latest?.report === "waiting") return view("idle");
  return view("working");
}
