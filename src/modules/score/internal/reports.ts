import type { TestOutcome } from "../types.ts";

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown): string => (typeof value === "string" ? value : "");

/** Vitest's JSON reporter: `testResults[].assertionResults[]` with `title` and `status`. Skipped tests are left out. */
export function readVitest(report: unknown): readonly TestOutcome[] {
  if (!isRecord(report)) return [];
  const outcomes: TestOutcome[] = [];
  for (const file of list(report["testResults"])) {
    if (!isRecord(file)) continue;
    for (const test of list(file["assertionResults"])) {
      if (!isRecord(test)) continue;
      const status = text(test["status"]);
      if (status !== "passed" && status !== "failed") continue;
      outcomes.push({ name: text(test["title"]), passed: status === "passed" });
    }
  }
  return outcomes;
}

function walkSuite(suite: unknown, into: TestOutcome[]): void {
  if (!isRecord(suite)) return;
  for (const child of list(suite["suites"])) walkSuite(child, into);
  for (const spec of list(suite["specs"])) {
    if (!isRecord(spec)) continue;
    const tests = list(spec["tests"]);
    const statuses = tests.map((test) => (isRecord(test) ? text(test["status"]) : ""));
    if (statuses.every((status) => status === "skipped")) continue;
    into.push({ name: text(spec["title"]), passed: spec["ok"] === true && statuses.every((status) => status === "expected") });
  }
}

/** Playwright's JSON reporter: nested `suites[]` with `specs[]`, each with `title`, `ok` and `tests[].status`. */
export function readPlaywright(report: unknown): readonly TestOutcome[] {
  if (!isRecord(report)) return [];
  const outcomes: TestOutcome[] = [];
  for (const suite of list(report["suites"])) walkSuite(suite, outcomes);
  return outcomes;
}
