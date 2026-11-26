import type { Objective } from "~/modules/playbook/types.ts";
import type { SetUpView } from "~/modules/views-manager/types.ts";
import type { Walkthrough } from "~/modules/walkthrough/types.ts";

/* What the set-up pages are given: the walkthrough, and what its pages show that the walkthrough has no place for. */

const STEPS: SetUpView["steps"] = [
  {
    label: "Said back",
    about: "What you want, so it can be measured",
    title: "What you want to get to",
    lead: "It says it back, and what it would count.",
  },
  { label: "Questions", about: "What only you know", title: "A few questions", lead: "At most three, each with an answer of its own." },
  {
    label: "Connect",
    about: "Read only, if it must",
    title: "What it would read",
    lead: "It says what it reads and what it cannot know without.",
  },
  { label: "Found", about: "What the past shows", title: "What it found", lead: "Each with where it was read. Say when one is wrong." },
  {
    label: "Draft",
    about: "The playbook before it is there",
    title: "The draft",
    lead: "Every line says why it is there. All of it is yours to edit.",
  },
  { label: "Ten cases", about: "Judge them, then yes", title: "Ten cases", lead: "Nothing is made before ten are judged and you say yes." },
];

function heardOf(objective: Objective | null): string | null {
  if (objective === null) return null;
  const { measure, aim } = objective;
  const before = "value" in measure.before ? `${measure.before.value} now` : `not known now (${measure.before.unknown})`;
  return `${measure.counts}, ${measure.unit}: ${before}, ${measure.better === "more" ? "at least" : "under"} ${aim.value} by ${aim.by}.`;
}

export function setUpView(walk: Walkthrough): SetUpView {
  const questions = walk.rounds.flatMap((round) => round.questions);
  return {
    walk,
    steps: STEPS,
    heard: heardOf(walk.objective),
    writtenBy: { skill: "set-up", version: 1 },
    asked: Object.fromEntries(
      questions.map((one) => [
        one.id,
        {
          many: false,
          best: [one.best],
          options: one.picks.map((pick) => ({ id: pick, label: pick, about: pick === one.best ? one.because : null })),
        },
      ]),
    ),
    looks: walk.wants.map((want) => ({ name: want.connector, had: null, signs: null })),
    figures: Object.fromEntries(walk.findings.map((one) => [one.id, { _tag: "Said" as const, text: one.says }])),
    sofar: Object.keys(walk.draft ?? {})
      .filter((path) => path !== "because.yaml")
      .map((path) => ({ part: path, says: (walk.draft?.[path] ?? "").split("\n").find((line) => line.trim() !== "") ?? "", isNew: false })),
    tried: null,
    draft: null,
  };
}
