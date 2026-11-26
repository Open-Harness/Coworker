import type { Check } from "~/modules/playbook/types.ts";
import type { Brief, Role } from "../types.ts";
import { outsideSaid, said } from "./outside.ts";

const roleWords: Readonly<Record<Role, string>> = {
  does: "You do the work of a step, with the tools you are offered.",
  checks: "You check, with fresh eyes, whether what was done is true. You cannot change anything.",
  judges: "You judge what came in: for each manager, what kind of thing it is and how well it fits.",
  searches: "You search, and say what you found.",
  speaks: "You speak with a person, in a chat, for the co-worker.",
  tries: "You try a playbook against a case, and say what happens.",
};

function checkWords(check: Check): string {
  const run = check.run === undefined ? "" : `: ${check.run}`;
  return `- ${check.says} (${check.id}, looked at by ${check.by}${run})`;
}

function skillsPart(skills: Brief["skills"]): readonly string[] {
  if (skills.length === 0) return [];
  return ["You can read these skills with the skill tool:", ...skills.map((one) => `- ${one.id}: ${one.says}`)];
}

function workPart(work: Brief["work"]): readonly string[] {
  if (work === null) return [];
  const checks = work.doneWhen === null || work.doneWhen.length === 0 ? [] : ["Done when:", ...work.doneWhen.map(checkWords)];
  return ["The work:", `${work.id}: ${work.title}`, work.about, `The step: ${work.step}`, ...checks];
}

function placePart(place: Brief["place"]): readonly string[] {
  if (place === null) return [];
  const files = Object.entries(place.files).flatMap(([path, text]) => [`The file ${path}:`, text]);
  return ["The place:", place.says, ...files];
}

function threadPart(thread: Brief["thread"]): readonly string[] {
  return thread.length === 0 ? [] : ["The thread so far:", outsideSaid, ...said(thread)];
}

function notesPart(notes: readonly string[]): readonly string[] {
  return notes.length === 0 ? [] : ["Notes:", ...notes.map((note) => `- ${note}`)];
}

/** What an agent is told, in this order: page, its words, skills; then work, place, thread, notes, and the task. */
export function prompt(brief: Brief): { readonly system: string; readonly user: string } {
  const system = [brief.page, `You are ${brief.agent.name}.`, brief.agent.told, roleWords[brief.role], ...skillsPart(brief.skills)];
  const user = [
    ...workPart(brief.work),
    ...placePart(brief.place),
    ...threadPart(brief.thread),
    ...notesPart(brief.notes),
    "Your task:",
    brief.todo,
  ];
  return { system: system.join("\n\n"), user: user.join("\n\n") };
}
