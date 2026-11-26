import type { Check, Step } from "~/modules/playbook/types.ts";
import type { Mandate } from "~/modules/reach/types.ts";
import type { Evidence, Work } from "../types.ts";

const filled = (text: string): boolean => text.trim() !== "";

/** What an agent is told when it is put on a step: the work, and the step's own words as they are. */
export function briefOf(work: Work, step: Step, note: string): string {
  return [work.title, work.about, `${step.name}: ${step.does}`, note].filter(filled).join("\n\n");
}

/** What a fresh checker is told: and by what ids to say it, for done when and for the step's leaves. */
export function checkBrief(work: Work, step: Step, note: string): string {
  const seen = new Set<string>();
  const checks: Check[] = [];
  for (const check of [...(work.doneWhen ?? []), ...step.leaves])
    if (!seen.has(check.id)) {
      seen.add(check.id);
      checks.push(check);
    }
  const base = briefOf(work, step, note);
  if (checks.length === 0) return base;
  const lines = checks.map((check) => `${check.id}: ${check.says}`);
  return `${base}\n\nSay for each of these, by its id, whether it is true, and what shows it:\n${lines.join("\n")}`;
}

export function whatOf(step: Step): string {
  return `the ${step.name} step`;
}

/** What was wrong, once: the words, and the words of each thing that did not hold. */
export function wrongOf(says: string, evidence: readonly Evidence[]): string {
  const parts = [says, ...evidence.filter((item) => !item.met).map((item) => item.says)].filter(filled);
  return [...new Set(parts)].join(" ");
}

export function doneWhy(work: Work): string {
  const says = (work.doneWhen ?? []).map((check) => check.says).join("; ");
  return says === "" ? "Everything that done means is shown." : `Everything that done means is shown: ${says}.`;
}

export function describeMandate(mandate: Mandate): string {
  const grants = mandate.grants.map((grant) => {
    const on = Object.entries(grant.may)
      .filter(([, may]) => may !== "off")
      .map(([action, may]) => `${action} (${may})`);
    return `${grant.account} in ${grant.place}: ${on.length === 0 ? "nothing" : on.join(", ")}`;
  });
  const limits = Object.entries(mandate.limits).map(([name, value]) => `${name} ${value}`);
  const state = mandate.state === "holds" ? [] : [`It is ${mandate.state}.`];
  return [
    `It may do: ${grants.length === 0 ? "nothing" : grants.join("; ")}.`,
    limits.length === 0 ? "" : `Limits: ${limits.join(", ")}.`,
    ...state,
  ]
    .filter(filled)
    .join(" ");
}
