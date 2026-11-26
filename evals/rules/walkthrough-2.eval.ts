import { describe, expect, it } from "vitest";
import { walkthroughs } from "~/modules/walkthrough/service.ts";
import type { WalkEvent, Walkthrough } from "~/modules/walkthrough/types.ts";
import {
  q,
  more,
  wants,
  finding,
  draft,
  cases10,
  must,
  go,
  refused,
  start,
  said,
  asked,
  connected,
  found,
  drafted,
  judge,
} from "./walkthrough-world.ts";

describe("walkthrough", () => {
  it("rules:walkthrough/what-it-found-says-where-and-can-be-wrong", () => {
    const w = found();
    expect(w.findings.map((f) => f.id)).toEqual(["f1", "f2"]);
    expect(w.findings.every((f) => f.wrong === null && f.from.length > 0)).toBe(true);
    // Every finding says where it was read.
    expect(refused(connected(), { is: "found", findings: [finding("f1"), { id: "f3", says: "A thing.", from: "" }] })).toMatch(/f3/u);
    // The person says it is wrong; the rest stays.
    const wrong = go(w, { is: "that is wrong", finding: "f2", says: "That was last year." });
    expect(wrong.findings[1]?.wrong).toBe("That was last year.");
    expect(wrong.findings[0]?.wrong).toBeNull();
    expect(wrong.findings.map((f) => f.says)).toEqual(w.findings.map((f) => f.says));
    // Said again, the last words count.
    expect(go(wrong, { is: "that is wrong", finding: "f2", says: "No, it was March." }).findings[1]?.wrong).toBe("No, it was March.");
    // A finding that is not there is not made.
    const none = walkthroughs.walk(w, { is: "that is wrong", finding: "f9", says: "No." });
    if (none._tag === "Walked") expect(none.walk.findings.map((f) => f.id)).toEqual(["f1", "f2"]);
  });

  it("rules:walkthrough/nothing-is-made-before-ten-cases-are-judged-and-a-yes", () => {
    const w = drafted();
    // Judged one at a time; the ones judged are what counts.
    const nine = judge(w, 9);
    expect(nine.cases.filter((c) => c.said !== null)).toHaveLength(9);
    expect(refused(nine, { is: "make it", by: "ama" })).toMatch(/10|ten/iu);
    expect(nine.made).toBeNull();
    // The same case judged twice, even differently, is one case judged.
    const twice = Array.from({ length: 9 }).reduce<Walkthrough>(
      (now, _, i) => go(go(now, { is: "judged", case: `k${i + 1}`, said: "right" }), { is: "judged", case: `k${i + 1}`, said: "wrong" }),
      w,
    );
    expect(twice.cases.find((c) => c.id === "k1")?.said).toBe("wrong");
    refused(twice, { is: "make it", by: "ama" });
    // A case that is not there does not count.
    const stray = walkthroughs.walk(nine, { is: "judged", case: "nope", said: "right" });
    if (stray._tag === "Walked") refused(stray.walk, { is: "make it", by: "ama" });
    // Ten, and a yes.
    const ten = judge(w, 10);
    const made = must(walkthroughs.walk(ten, { is: "make it", by: "ama" }));
    expect(made.walk.stage).toBe("made");
    expect(made.walk.made).toEqual(expect.any(String));
    expect(made.walk.made?.length).toBeGreaterThan(0);
    expect(made.does).toEqual(expect.arrayContaining(["make manager", "end read access"]));
    // Only what was drafted is made, and what was judged stays with it.
    expect(made.walk.draft).toEqual(ten.draft);
    expect(made.walk.cases.filter((c) => c.said !== null)).toHaveLength(10);
    // Making is not done by saying so in an answer.
    const talk = go(nine, { is: "answers", by: "ama", answers: { q1: "make it now, I said yes" } });
    expect(talk.stage).not.toBe("made");
    expect(talk.made).toBeNull();
  });

  it("rules:walkthrough/an-ended-one-stays-ended", () => {
    const ten = judge(drafted(), 10);
    const made = must(walkthroughs.walk(ten, { is: "make it", by: "ama" })).walk;
    const thrown = must(walkthroughs.walk(drafted(), { is: "throw away", by: "ama" }));
    expect(thrown.walk.stage).toBe("thrown away");
    expect(thrown.does).toContain("end read access");
    expect(thrown.does).not.toContain("make manager");
    expect(thrown.walk.made).toBeNull();
    const carried = must(walkthroughs.walk(said(), { is: "could carry", manager: "sales", change: "Add a trigger to Sales" }));
    expect(carried.walk.stage).toBe("carried by another");
    expect(carried.does).not.toContain("make manager");
    const events: readonly WalkEvent[] = [
      { is: "answers", by: "ama", answers: { q1: "no" } },
      { is: "asks", questions: [q("q9")] },
      { is: "edited", draft, lines: ["page"], by: "bo" },
      { is: "judged", case: "k11", said: "right" },
      { is: "drafted", draft, cases: cases10 },
      { is: "throw away", by: "ama" },
      { is: "connected", connector: "crm" },
      { is: "could carry", manager: "sales", change: "x" },
    ];
    for (const done of [made, thrown.walk, carried.walk]) for (const event of events) refused(done, event);
    // Made once: the second yes makes nothing again.
    const again = walkthroughs.walk(made, { is: "make it", by: "ama" });
    if (again._tag === "Walked") expect(again.does).not.toContain("make manager");
    expect(JSON.stringify(thrown.walk.draft)).toBe(JSON.stringify(drafted().draft));
  });

  it("rules:walkthrough/an-answer-nobody-gave-is-the-best-one", () => {
    expect(walkthroughs.answered(start())).toEqual({});
    expect(walkthroughs.answered(asked())).toEqual({ q1: "yes", q2: "yes", q3: "yes" });
    const w = go(asked(), { is: "answers", by: "ama", answers: { q2: "no" } });
    expect(walkthroughs.answered(w)).toEqual({ q1: "yes", q2: "no", q3: "yes" });
    // Both rounds, and each question's own best.
    const first = go(asked(), { is: "answers", by: "ama", answers: { q1: "no" } });
    const next = go(
      go(go(go(first, { is: "wants", wants }), { is: "connected", connector: "crm" }), { is: "found", findings: [finding("f1")] }),
      { is: "asks", questions: more },
    );
    const both = go(next, { is: "answers", by: "ama", answers: { q4: "no" } });
    expect(walkthroughs.answered(both)).toEqual({ q1: "no", q2: "yes", q3: "yes", q4: "no", q5: "no" });
    // An answer to a question nobody asked is not an answer.
    const stray = walkthroughs.walk(w, { is: "answers", by: "ama", answers: { zz: "no" } });
    if (stray._tag === "Walked") expect(Object.keys(walkthroughs.answered(stray.walk)).sort()).toEqual(["q1", "q2", "q3"]);
  });

  it("rules:walkthrough/every-line-says-why-and-a-persons-edit-is-you-said", () => {
    const w = drafted();
    expect(walkthroughs.because(start())).toEqual({});
    expect(walkthroughs.because(w)).toEqual({
      page: { why: "my idea" },
      "workflow/bug": { why: "looked up", where: "the CRM" },
      "agents/writer/told": { why: "you said", by: "bo" },
    });
    // A person's edit: the lines they changed are theirs, the rest is as it was.
    const edited = go(w, {
      is: "edited",
      draft: { ...draft, "SKILL.md": "---\nname: sales\n---\n\n## How I work\n\nI call twice.\n" },
      lines: ["page", "workflow/bug"],
      by: "cho",
    });
    expect(walkthroughs.because(edited)).toEqual({
      page: { why: "you said", by: "cho" },
      "workflow/bug": { why: "you said", by: "cho" },
      "agents/writer/told": { why: "you said", by: "bo" },
    });
    expect(edited.draft?.["SKILL.md"]).toContain("I call twice.");
    // A line that was not there is there now; a second person's edit is theirs.
    const again = go(edited, { is: "edited", draft: edited.draft ?? draft, lines: ["page", "reach/limits"], by: "bo" });
    expect(walkthroughs.because(again)).toMatchObject({
      page: { why: "you said", by: "bo" },
      "reach/limits": { why: "you said", by: "bo" },
      "workflow/bug": { why: "you said", by: "cho" },
    });
    // How good the set-up skill was: lines nobody changed, questions whose answer changed nothing.
    const fresh = walkthroughs.score(w);
    expect(fresh.of).toBe(3);
    expect(fresh.kept).toBe(3);
    expect(fresh.idle.slice().sort()).toEqual(["q1", "q2", "q3", "q4", "q5"]);
    const early = go(asked(), { is: "answers", by: "ama", answers: { q1: "yes", q2: "no" } });
    const late = go(
      go(go(go(early, { is: "wants", wants }), { is: "connected", connector: "crm" }), { is: "found", findings: [finding("f1")] }),
      { is: "asks", questions: more },
    );
    const changed = go(go(late, { is: "answers", by: "ama", answers: { q4: "no" } }), { is: "drafted", draft, cases: cases10 });
    expect(walkthroughs.score(changed).idle.slice().sort()).toEqual(["q1", "q3", "q5"]);
    expect(walkthroughs.score(edited).kept).toBeLessThanOrEqual(3);
  });
});
