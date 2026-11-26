import type { WalkEvent, Walked, Walkthrough } from "../types.ts";
import { wrongFindings, wrongQuestions, wrongWants } from "./check.ts";
import { refuse, walked } from "./result.ts";

type Is<T extends WalkEvent["is"]> = Extract<WalkEvent, { is: T }>;

function askedIds(walk: Walkthrough): ReadonlySet<string> {
  return new Set(walk.rounds.flatMap((round) => round.questions.map((question) => question.id)));
}

export function measured(walk: Walkthrough, event: Is<"measured">): Walked {
  if (walk.stage !== "said") return refuse("It is said back only at the start, before the questions.");
  return walked({ ...walk, objective: event.objective });
}

export function couldCarry(walk: Walkthrough): Walked {
  if (walk.stage !== "said") return refuse("Another manager can be asked to carry it only at the start.");
  return walked({ ...walk, stage: "carried by another" });
}

export function asks(walk: Walkthrough, event: Is<"asks">): Walked {
  if (walk.rounds.length >= 2) return refuse("There are two rounds of questions and no third.");
  const first = walk.stage === "said";
  if (!first && walk.stage !== "found") return refuse("A round of questions comes at the start, and one more after what it found.");
  const wrong = wrongQuestions(event.questions, askedIds(walk));
  if (wrong) return refuse(wrong);
  const rounds = [...walk.rounds, { questions: event.questions, answers: {} }];
  return walked({ ...walk, rounds, stage: first ? "first questions" : "second questions" });
}

export function answers(walk: Walkthrough, event: Is<"answers">): Walked {
  const latest = walk.rounds.at(-1);
  if (!latest) return refuse("There is no question to answer yet.");
  const own = new Set(latest.questions.map((question) => question.id));
  const given = Object.fromEntries(Object.entries(event.answers).filter(([id]) => own.has(id)));
  const rounds = [...walk.rounds.slice(0, -1), { ...latest, answers: { ...latest.answers, ...given } }];
  return walked({ ...walk, rounds });
}

export function wants(walk: Walkthrough, event: Is<"wants">): Walked {
  if (walk.stage !== "first questions") return refuse("It asks to connect once, after the first questions.");
  const wrong = wrongWants(event.wants);
  if (wrong) return refuse(wrong);
  return walked({ ...walk, stage: "connect", wants: event.wants.map((want) => ({ ...want, state: "asked" })) });
}

export function found(walk: Walkthrough, event: Is<"found">): Walked {
  if (walk.stage !== "connect") return refuse("What it found comes after connecting.");
  const wrong = wrongFindings(event.findings);
  if (wrong) return refuse(wrong);
  return walked({ ...walk, stage: "found", findings: event.findings.map((finding) => ({ ...finding, wrong: null })) });
}
