import { describe, expect, it } from "vitest";
import bin from "~/bin/score.ts?raw";
import { score } from "./service.ts";
import type { BookEval, ScoreFile, ScoreInput } from "./types.ts";

const BOOK = `## 4. Milestones

### 1 · Foundations (needs nothing)

#### Ground (lane: platform)

- \`gate:repo\` The repo is a git repo.
- \`acc:vault/at-rest\` A stored secret is ciphertext,
  and the plaintext appears in no table.

### 2 · A manager works (needs 1)

#### The manager (lane: manager)

- \`ui:manager/board\` The board shows tasks.

## 5. Old modules to new

- \`acc:not/an-eval\` Outside section 4, so not an eval.
`;

const parsed = (): readonly BookEval[] => {
  const result = score.parseBook(BOOK);
  if (!Array.isArray(result)) throw new Error("book did not parse");
  return result;
};

const run = (over: Partial<ScoreInput>): ScoreInput => ({
  book: parsed(),
  outcomes: [],
  computed: {},
  tiersRun: ["fast"],
  redGates: [],
  previous: undefined,
  at: "2026-11-23T22:00:00Z",
  commit: "abc1234",
  ...over,
});

describe("score", () => {
  it("reads evals, their milestone and lane, and claims that run onto the next line", () => {
    const evals = parsed();
    expect(evals.map((entry) => entry.id)).toEqual(["gate:repo", "acc:vault/at-rest", "ui:manager/board"]);
    expect(evals[1]).toMatchObject({ milestone: "1", milestoneName: "Foundations", lane: "platform" });
    expect(evals[1]?.claim).toBe("A stored secret is ciphertext, and the plaintext appears in no table.");
  });

  it("refuses a book that names an eval twice", () => {
    expect(score.parseBook(`${BOOK.split("## 5")[0]}- \`gate:repo\` Again.\n`)).toEqual({ _tag: "DuplicateInBook", id: "gate:repo" });
  });

  it("passes an eval whose one test passed, and marks one with no test missing", () => {
    const report = score.judge(
      run({
        outcomes: [
          { name: "acc:vault/at-rest", passed: true },
          { name: "a plain unit test", passed: true },
        ],
      }),
    );
    expect(report.file.evals).toEqual({ "gate:repo": "missing", "acc:vault/at-rest": "pass", "ui:manager/board": "missing" });
    expect(report.score).toBe(1);
    expect(report.problems).toEqual([]);
  });

  it("flags a test named like an eval that the book does not have", () => {
    const report = score.judge(run({ outcomes: [{ name: "acc:made/up", passed: true }] }));
    expect(report.problems).toEqual([{ _tag: "NotInBook", name: "acc:made/up" }]);
  });

  it("fails an eval two tests claim", () => {
    const outcomes = [
      { name: "acc:vault/at-rest", passed: true },
      { name: "acc:vault/at-rest", passed: true },
    ];
    const report = score.judge(run({ outcomes }));
    expect(report.file.evals["acc:vault/at-rest"]).toBe("fail");
    expect(report.problems).toContainEqual({ _tag: "NamedTwice", id: "acc:vault/at-rest" });
  });

  it("keeps the last result of a tier that did not run", () => {
    const previous: ScoreFile = { evals: { "ui:manager/board": "pass" }, history: [] };
    const report = score.judge(run({ previous }));
    expect(report.file.evals["ui:manager/board"]).toBe("pass");
    expect(report.problems).toEqual([]);
  });

  it("gate:score", () => {
    const ok = { name: "acc:vault/at-rest", passed: true };
    const clean = score.judge(run({ outcomes: [ok, { name: "a support test", passed: true }], computed: { "gate:repo": "pass" } }));
    // A support test neither scores nor fails the run.
    expect(clean.problems).toEqual([]);
    expect(clean.score).toBe(2);
    expect(score.table(clean)).toBe(
      ["1 Foundations                2 / 2   pass", "2 A manager works            0 / 1   pass", "Score                        2 / 3"].join(
        "\n",
      ),
    );
    expect(score.judge(run({ outcomes: [ok, { name: "acc:made/up", passed: true }] })).problems).toEqual([
      { _tag: "NotInBook", name: "acc:made/up" },
    ]);
    expect(score.judge(run({ outcomes: [ok, ok] })).problems).toEqual([{ _tag: "NamedTwice", id: "acc:vault/at-rest" }]);
    const broken = score.judge(run({ outcomes: [ok, { name: "a support test", passed: false }] }));
    expect(broken.problems).toEqual([{ _tag: "GateRed", gate: "tests" }]);
    expect(broken.score).toBe(0);
    // The command prints that table, keeps that file, and exits 1 on any problem.
    expect(bin).toContain('const SCORE_FILE = "status/score.json";');
    expect(bin).toContain("writeFileSync(SCORE_FILE, `${JSON.stringify(report.file, null, 1)}\\n`);");
    expect(bin).toContain("console.log(`\\n${score.table(report)}`);");
    expect(bin).toContain("process.exit(report.problems.length === 0 ? 0 : 1);");
  });

  it("gate:ratchet", () => {
    const previous: ScoreFile = { evals: { "acc:vault/at-rest": "pass", "gate:repo": "pass" }, history: [] };
    const report = score.judge(
      run({ previous, outcomes: [{ name: "acc:vault/at-rest", passed: false }], computed: { "gate:repo": "pass" } }),
    );
    expect(report.problems).toEqual([{ _tag: "Regressed", id: "acc:vault/at-rest", now: "fail" }]);
    const gone = score.judge(run({ previous }));
    expect(gone.problems).toContainEqual({ _tag: "Regressed", id: "acc:vault/at-rest", now: "missing" });
  });

  it("scores 0 while a gate is red, and still records results and history", () => {
    const previous: ScoreFile = { evals: {}, history: [{ at: "x", pass: 0, fail: 0, missing: 3, total: 3, score: 0, commit: null }] };
    const report = score.judge(run({ previous, redGates: ["lint"], outcomes: [{ name: "acc:vault/at-rest", passed: true }] }));
    expect(report.score).toBe(0);
    expect(report.file.evals["acc:vault/at-rest"]).toBe("pass");
    expect(report.file.history).toHaveLength(2);
    expect(report.problems).toEqual([{ _tag: "GateRed", gate: "lint" }]);
  });

  it("reads Vitest and Playwright JSON reports, leaving out skipped tests", () => {
    const vitest = {
      testResults: [
        {
          assertionResults: [
            { title: "a", status: "passed" },
            { title: "b", status: "failed" },
            { title: "c", status: "skipped" },
          ],
        },
      ],
    };
    expect(score.readVitest(vitest)).toEqual([
      { name: "a", passed: true },
      { name: "b", passed: false },
    ]);
    const playwright = {
      suites: [{ suites: [{ specs: [{ title: "ui:join/invite", ok: true, tests: [{ status: "expected" }] }] }], specs: [] }],
    };
    expect(score.readPlaywright(playwright)).toEqual([{ name: "ui:join/invite", passed: true }]);
    expect(score.readVitest("nonsense")).toEqual([]);
  });

  it("keeps the baseline after a regression, so the next run reports it again", () => {
    const outcomes = [{ name: "acc:vault/at-rest", passed: false }];
    const good = score.judge(run({ outcomes: [{ name: "acc:vault/at-rest", passed: true }] })).file;
    const first = score.judge(run({ outcomes, previous: good }));
    expect(first.file.evals["acc:vault/at-rest"]).toBe("pass");
    expect(first.file.history.at(-1)).toMatchObject({ pass: 0, fail: 1 });
    expect(score.judge(run({ outcomes, previous: first.file })).problems).toEqual(first.problems);
  });

  it("prints passing evals per milestone", () => {
    const report = score.judge(run({ outcomes: [{ name: "acc:vault/at-rest", passed: true }] }));
    expect(score.table(report)).toContain("1 Foundations");
    expect(score.table(report)).toMatch(/Score\s+1 \/ 3/u);
  });
});

const LIVE_BOOK = `## 4. Milestones

### 3 · It hears the world (needs 2)

#### Email (lane: email)

- \`flw:email/dedupe\` The same message twice makes one Trigger.
- \`live:email/round-trip\` On staging: the reply reaches the mailbox.
- \`live:email/stranger\` On staging: the stranger makes no task.
`;

describe("the live tier", () => {
  const book = score.parseBook(LIVE_BOOK);
  if (!Array.isArray(book)) throw new Error("book did not parse");
  const ran = (over: Partial<ScoreInput>): ScoreInput => run({ book, ...over });
  const passed: ScoreFile = {
    evals: { "flw:email/dedupe": "pass", "live:email/round-trip": "pass", "live:email/stranger": "pass" },
    history: [],
  };

  it("is its own tier, run only on request", () => {
    expect(score.tierOf("live")).toBe("live");
    expect(bin).toContain('process.argv.includes("--live")');
    expect(bin).toContain('tiers.push("live")');
  });

  it("carries results forward in a run without --live, as it does for ui", () => {
    const report = score.judge(ran({ previous: passed, outcomes: [{ name: "flw:email/dedupe", passed: true }] }));
    expect(report.file.evals["live:email/round-trip"]).toBe("pass");
    expect(report.problems).toEqual([]);
  });

  it("never counts a skipped live test as a pass, and a skipped one is not a fail either", () => {
    // Skipped tests are not outcomes at all, so the evals have no test: missing, which is not a pass.
    const vitest = {
      testResults: [
        {
          assertionResults: [
            { title: "live:email/round-trip", status: "skipped" },
            { title: "live:email/stranger", status: "pending" },
          ],
        },
      ],
    };
    const outcomes = score.readVitest(vitest);
    expect(outcomes).toEqual([]);
    const fresh = score.judge(ran({ tiersRun: ["fast", "live"], outcomes }));
    expect(fresh.file.evals["live:email/round-trip"]).toBe("missing");
    expect(fresh.file.evals["live:email/stranger"]).toBe("missing");
    expect(fresh.score).toBe(0);
    expect(fresh.problems).toEqual([]);
    // After a real pass, a --live run that could not run them is a regression, not a quiet pass.
    const again = score.judge(ran({ tiersRun: ["fast", "live"], previous: passed, outcomes }));
    expect(again.problems).toContainEqual({ _tag: "Regressed", id: "live:email/round-trip", now: "missing" });
  });

  it("passes and fails live evals by their tests when the tier ran", () => {
    const outcomes = [
      { name: "live:email/round-trip", passed: true },
      { name: "live:email/stranger", passed: false },
    ];
    const report = score.judge(ran({ tiersRun: ["fast", "live"], outcomes }));
    expect(report.file.evals).toMatchObject({ "live:email/round-trip": "pass", "live:email/stranger": "fail" });
  });
});
