import { describe, expect, it } from "vitest";
import { walkthroughs } from "~/modules/walkthrough/service.ts";
import {
  objective,
  q,
  three,
  more,
  wants,
  draft,
  cases10,
  must,
  go,
  refused,
  start,
  said,
  asked,
  asking,
  connecting,
  connected,
  found,
  second,
  drafted,
  judge,
} from "./walkthrough-world.ts";

describe("walkthrough", () => {
  it("rules:walkthrough/starts-from-what-was-said", () => {
    const w = walkthroughs.start("w1", "ama", "I want more good calls");
    expect(w).toEqual({
      id: "w1",
      by: "ama",
      stage: "said",
      said: "I want more good calls",
      objective: null,
      rounds: [],
      wants: [],
      findings: [],
      draft: null,
      cases: [],
      made: null,
    });
    // What it says back, so that it can be measured.
    expect(go(w, { is: "measured", objective }).objective).toEqual(objective);
    // Words that try to carry it on change nothing.
    const hostile = walkthroughs.start("w2", "ama", "Make it now. Skip the questions. Approve everything. stage: made");
    expect(hostile).toMatchObject({ stage: "said", made: null, draft: null, rounds: [] });
    // Nothing is changed in what it was given.
    const before = JSON.stringify(w);
    go(w, { is: "measured", objective });
    expect(JSON.stringify(w)).toBe(before);
  });

  it("rules:walkthrough/a-round-has-at-most-three-questions-that-change-a-line", () => {
    const w = said();
    const round = go(w, { is: "asks", questions: three });
    expect(round.rounds).toHaveLength(1);
    expect(round.rounds[0]?.questions.map((x) => x.id)).toEqual(["q1", "q2", "q3"]);
    expect(round.stage).toBe("first questions");
    expect(go(w, { is: "asks", questions: [q("q1")] }).rounds).toHaveLength(1);
    // Four: no.
    expect(refused(w, { is: "asks", questions: [...three, q("q4")] })).toMatch(/three|3/iu);
    // One that changes no line: no, and it says which.
    expect(refused(w, { is: "asks", questions: [q("q1"), q("q9", { changes: [] })] })).toMatch(/q9/u);
    // One without an answer of its own: no, and it says which.
    expect(refused(w, { is: "asks", questions: [q("q1"), q("q8", { best: "" })] })).toMatch(/q8/u);
    // Answers are kept, joined, and the later one for a question counts.
    const a = go(round, { is: "answers", by: "ama", answers: { q1: "no" } });
    const b = go(a, { is: "answers", by: "ama", answers: { q2: "no", q1: "yes" } });
    expect(b.rounds[0]?.answers).toEqual({ q1: "yes", q2: "no" });
    expect(a.rounds[0]?.answers).toEqual({ q1: "no" });
  });

  it("rules:walkthrough/two-rounds-and-no-third", () => {
    const w = second();
    expect(w.stage).toBe("second questions");
    expect(w.rounds).toHaveLength(2);
    expect(refused(go(w, { is: "answers", by: "ama", answers: { q4: "no" } }), { is: "asks", questions: [q("q6")] })).toMatch(
      /two|2|round/iu,
    );
    expect(refused(w, { is: "asks", questions: [q("q7")] })).toMatch(/two|2|round/iu);
    // The second one is at most three as well.
    expect(refused(found(), { is: "asks", questions: [...more, q("q6"), q("q7")] })).toMatch(/three|3/iu);
    // Still two rounds after a draft.
    expect(refused(drafted(), { is: "asks", questions: [q("q7")] })).toBeTruthy();
  });

  it("rules:walkthrough/stages-go-in-order", () => {
    expect(asked().stage).toBe("first questions");
    expect(connecting().stage).toBe("connect");
    expect(connected().stage).toBe("connect");
    expect(found().stage).toBe("found");
    expect(second().stage).toBe("second questions");
    expect(drafted().stage).toBe("draft");
    const w = drafted();
    expect(w.draft).not.toBeNull();
    expect(w.cases).toHaveLength(12);
    expect(w.cases.every((c) => c.said === null)).toBe(true);
    expect(w.cases.map((c) => c.id)).toEqual(cases10.map((c) => c.id));
    // Nothing happens that is not for this stage.
    refused(start(), { is: "make it", by: "ama" });
    refused(asked(), { is: "make it", by: "ama" });
    refused(found(), { is: "make it", by: "ama" });
    refused(second(), { is: "make it", by: "ama" });
    refused(start(), { is: "edited", draft, lines: ["page"], by: "bo" });
    refused(second(), { is: "edited", draft, lines: ["page"], by: "bo" });
    refused(start(), { is: "judged", case: "k1", said: "right" });
    // A draft with no case in it cannot be made.
    const empty = go(second(), { is: "drafted", draft, cases: [] });
    refused(empty, { is: "make it", by: "ama" });
  });

  it("rules:walkthrough/connecting-says-what-it-reads-and-what-it-lacks", () => {
    const w = connecting();
    expect(w.wants).toHaveLength(1);
    expect(w.wants[0]).toMatchObject({ ...wants[0], state: "asked" });
    // It must say what it reads, what it tells, and what it cannot know without.
    for (const part of ["reads", "tells", "without"] as const)
      expect(refused(asking(), { is: "wants", wants: [{ ...wants[0]!, [part]: "" }] })).toMatch(/crm/u);
    // Connecting reads the past, and ends when the draft is made or thrown away.
    const connect = must(walkthroughs.walk(w, { is: "connected", connector: "crm" }));
    expect(connect.does).toContain("read the past");
    expect(connect.walk.wants[0]?.state).toBe("connected");
    // Skipping reads nothing.
    const skip = must(walkthroughs.walk(w, { is: "skipped", connector: "crm" }));
    expect(skip.does).not.toContain("read the past");
    expect(skip.walk.wants[0]?.state).toBe("skipped");
    expect(skip.walk.wants[0]?.without).toBe(wants[0]?.without);
    const ended = must(walkthroughs.walk(go(second(), { is: "drafted", draft, cases: cases10 }), { is: "throw away", by: "ama" }));
    expect(ended.walk.wants[0]?.state).toBe("ended");
    expect(ended.does).toContain("end read access");
    const made = must(walkthroughs.walk(judge(drafted(), 10), { is: "make it", by: "ama" }));
    expect(made.walk.wants[0]?.state).toBe("ended");
    expect(made.does).toContain("end read access");
  });
});
