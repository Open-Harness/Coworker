import { fauxToolCall } from "@earendil-works/pi-ai";

/*
 * Phrases of the fake world's scripted model that need more than a line: asking it to take its time, so a test can look
 * at an answer while it is still being written, to stop a run, and the long question a "Needs you" page shows.
 */

export const slug = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 60);

/** "stop run-2" is the manager's `run_stop` tool. */
export function stopCall(prompt: string, id: { readonly id: string }) {
  const run = /\bstop (run-\d+)/iu.exec(prompt)?.[1];
  return run === undefined ? undefined : fauxToolCall("run_stop", { run: run.toLowerCase() }, id);
}

/** How many times a run says "Step after step." before it reports: `slowly` takes a few seconds, `keeps going` minutes. */
export function stepsFor(brief: string): number {
  if (/\bkeeps going\b/iu.test(brief)) return 60_000;
  return /\bslowly\b/iu.test(brief) ? 4_000 : 0;
}

/** The words a person asking the manager to write at length gets: numbered points that end on a closing line. */
export const LONG_ANSWER_END = "That is the whole of it.";

export function longAnswer(): string {
  const points = Array.from({ length: 700 }, (_, index) => `Point ${index + 1}: the export keeps its rows in the order you filter them.`);
  return `Here is the long version.\n\n${points.join("\n\n")}\n\n${LONG_ANSWER_END}`;
}

/** The question of "ask me to decide on DT-n: ...", with everything a "Needs you" page shows. */
export const decideArgs = (task: string, question: string, options: readonly string[]) => ({
  id: slug(question),
  question,
  task,
  choices: options.map((label) => ({ label, next: [`The manager carries on with ${label}`] })),
  recommend: { option: options[0] ?? "", why: "It keeps the date and only one customer asked for more." },
  context: `${question} The manager won't pick this alone because it is a promise to customers.`,
  facts: [
    { text: "The task is on the board.", source: task },
    { text: "The mission says what we promised.", source: "mission" },
  ],
  links: [task, "mission"],
});
