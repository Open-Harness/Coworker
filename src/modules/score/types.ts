/** The score: which evals in the book pass, judged from test results, with the ratchet. Pure; no I/O. */

export type EvalKind = "gate" | "acc" | "flw" | "ui" | "live" | "spike";
/** fast: no network, every iteration. ui: the built app in a browser. live: staging. */
export type Tier = "fast" | "ui" | "live";
export type Result = "pass" | "fail" | "missing";

/** One eval as the book states it. */
export interface BookEval {
  readonly id: string;
  readonly kind: EvalKind;
  /** "1".."4", or "spike". */
  readonly milestone: string;
  readonly milestoneName: string;
  readonly lane: string;
  readonly claim: string;
}

export type BookError = { readonly _tag: "DuplicateInBook"; readonly id: string } | { readonly _tag: "EmptyBook" };

/** One test that ran, from any runner. `name` is the test's own title. */
export interface TestOutcome {
  readonly name: string;
  readonly passed: boolean;
}

export interface HistoryRow {
  readonly at: string;
  readonly pass: number;
  readonly fail: number;
  readonly missing: number;
  readonly total: number;
  readonly score: number;
  readonly commit: string | null;
}

/** What status/score.json holds. */
export interface ScoreFile {
  readonly evals: Readonly<Record<string, Result>>;
  readonly history: readonly HistoryRow[];
}

export interface ScoreInput {
  readonly book: readonly BookEval[];
  /** Tests from every runner that ran in this score. */
  readonly outcomes: readonly TestOutcome[];
  /** Results worked out without a test, such as gate:repo. */
  readonly computed: Readonly<Record<string, Result>>;
  /** Tiers whose tests ran; evals of other tiers keep their last result. */
  readonly tiersRun: readonly Tier[];
  /** Gates (typecheck, lint, shape, ui, size, tests) that are red. Any red gate makes the score 0. */
  readonly redGates: readonly string[];
  readonly previous: ScoreFile | undefined;
  readonly at: string;
  readonly commit: string | undefined;
}

export type ScoreProblem =
  | { readonly _tag: "NotInBook"; readonly name: string }
  | { readonly _tag: "NamedTwice"; readonly id: string }
  | { readonly _tag: "Regressed"; readonly id: string; readonly now: Result }
  | { readonly _tag: "GateRed"; readonly gate: string };

export interface ScoreReport {
  readonly file: ScoreFile;
  readonly rows: readonly (BookEval & { readonly result: Result })[];
  readonly score: number;
  readonly problems: readonly ScoreProblem[];
}

export interface Score {
  /** Reads the evals out of the book's Markdown. */
  readonly parseBook: (markdown: string) => readonly BookEval[] | BookError;
  /** True when a test's name has the shape of an eval id (`kind:area/name`). */
  readonly isEvalName: (name: string) => boolean;
  readonly tierOf: (kind: EvalKind) => Tier;
  /** Support tests, those with no eval id, that failed. One is enough to turn the `tests` gate red. */
  readonly brokenSupport: (outcomes: readonly TestOutcome[]) => readonly TestOutcome[];
  /** Judges one run against the book and the last score file. */
  readonly judge: (input: ScoreInput) => ScoreReport;
  /** Turns a Vitest or Playwright JSON report (unknown shape) into outcomes. */
  readonly readVitest: (report: unknown) => readonly TestOutcome[];
  readonly readPlaywright: (report: unknown) => readonly TestOutcome[];
  /** A plain-text table: passing evals per milestone. */
  readonly table: (report: ScoreReport) => string;
  readonly describeProblem: (problem: ScoreProblem) => string;
}
