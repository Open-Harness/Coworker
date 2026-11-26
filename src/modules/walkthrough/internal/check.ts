import type { Finding, Question, Wants } from "../types.ts";

const MOST = 3;

/** What is wrong with a round of questions, in words for a person; null when it is fine. */
export function wrongQuestions(questions: readonly Question[], asked: ReadonlySet<string>): string | null {
  if (questions.length > MOST) return `A round has at most three questions, and this one has ${questions.length}.`;
  const seen = new Set<string>();
  for (const question of questions) {
    if (question.changes.length === 0) return `Question ${question.id} changes no line, so it may not be asked.`;
    if (question.best.trim() === "") return `Question ${question.id} has no answer of its own.`;
    if (asked.has(question.id) || seen.has(question.id)) return `Question ${question.id} was asked already.`;
    seen.add(question.id);
  }
  return null;
}

/** A want must say what it reads, what it tells and what it cannot know without. */
export function wrongWants(wants: readonly Omit<Wants, "state">[]): string | null {
  for (const want of wants) {
    for (const part of ["reads", "tells", "without"] as const) {
      if (want[part].trim() === "")
        return `The connection to ${want.connector} does not say what it ${part === "without" ? "cannot know without" : part}.`;
    }
  }
  return null;
}

/** A finding must say where it was read. */
export function wrongFindings(findings: readonly Omit<Finding, "wrong">[]): string | null {
  const bare = findings.find((finding) => finding.from.trim() === "");
  return bare ? `Finding ${bare.id} does not say where it was read.` : null;
}
