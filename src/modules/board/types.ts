/** What a run said last about its work. */
export type Report = "progress" | "waiting" | "ready" | "blocked" | "failed" | "dropped";

/** Where an open task waits. Derived from facts, never set by hand. */
export type Stage = "person.answer" | "person.review" | "person.blocked" | "queued" | "idle" | "working";

/** The facts a stage is derived from. */
export interface TaskFacts {
  readonly openQuestions: number;
  /** Runs in order. A run is started once it is no longer queued. */
  readonly runs: readonly { readonly state: "queued" | "running" | "ended"; readonly report?: Report; readonly reportedAt?: number }[];
  /** When a person last wrote on the task: a comment, an answer, a chat message about it. */
  readonly lastPersonWriteAt?: number;
}

export interface StageView {
  readonly stage: Stage;
  /** How the stage reads on screens, as in model.md "Stages". */
  readonly label: string;
}

/** The board's pure rules. */
export interface BoardRules {
  /** First match wins: an open question, a ready report, a blocking report nobody answered, no run started, waiting, else working. */
  readonly stageOf: (facts: TaskFacts) => StageView;
}
