import { expect } from "vitest";
import { walkthroughs } from "~/modules/walkthrough/service.ts";
import type { Case10, Question, WalkEvent, Walked, Walkthrough } from "~/modules/walkthrough/types.ts";
import type { Files, Objective } from "~/modules/playbook/types.ts";

export const objective: Objective = {
  said: "More good calls",
  measure: {
    counts: "Calls that took place",
    unit: "a week",
    better: "more",
    read: { from: "connector", account: "crm", query: "deals where stage = 'call held'" },
    settles: "14d",
    before: { value: 9, at: "2026-11-01" },
  },
  aim: { value: 12, by: "2026-12-31" },
  notWorse: [],
  owner: "bo",
};
export const q = (id: string, more: Partial<Question> = {}): Question => ({
  id,
  ask: `What is ${id}?`,
  picks: ["yes", "no"],
  best: "yes",
  because: "Only you know.",
  changes: ["agents/writer/told"],
  ...more,
});
export const three = [q("q1"), q("q2"), q("q3")];
export const more = [q("q4"), q("q5", { best: "no" })];
export const wants = [
  { connector: "crm", reads: "Deals of the last 30 days", tells: "How many calls took place", without: "Which calls were good" },
];
export const finding = (id: string, from = "the CRM, deals of the last 30 days") => ({ id, says: `Finding ${id}.`, from });
export const draft: Files = {
  "SKILL.md": "---\nname: sales\n---\n\n## How I work\n\nI call.\n",
  "because.yaml":
    "page:\n  why: my idea\nworkflow/bug:\n  why: looked up\n  where: the CRM\nagents/writer/told:\n  why: you said\n  by: bo\n",
};
export const cases10 = Array.from({ length: 12 }, (_, i): Omit<Case10, "said"> => ({
  id: `k${i + 1}`,
  what: `Case ${i + 1}`,
  would: "It would call.",
  happened: "Bo called.",
}));

export const must = (walked: Walked): Extract<Walked, { _tag: "Walked" }> => {
  expect(walked._tag).toBe("Walked");
  if (walked._tag !== "Walked") throw new Error(`refused: ${walked.why}`);
  return walked;
};
export const go = (w: Walkthrough, event: WalkEvent) => must(walkthroughs.walk(w, event)).walk;
export const refused = (w: Walkthrough, event: WalkEvent) => {
  const said = walkthroughs.walk(w, event);
  expect(said._tag).toBe("Refused");
  if (said._tag !== "Refused") throw new Error("not refused");
  expect(said.why.trim().length).toBeGreaterThan(3);
  expect(said.why).not.toMatch(/\b(blocked|pending)\b/iu);
  return said.why;
};
/** What came out is one of: refused, or taken without making what it must not make twice. */
export const start = () => walkthroughs.start("w1", "ama", "I want more good calls");
export const said = () => go(start(), { is: "measured", objective });
export const asked = () => go(said(), { is: "asks", questions: three });
export const asking = () => go(asked(), { is: "answers", by: "ama", answers: { q1: "yes" } });
export const connecting = () => go(asking(), { is: "wants", wants });
export const connected = () => go(connecting(), { is: "connected", connector: "crm" });
export const found = () => go(connected(), { is: "found", findings: [finding("f1"), finding("f2")] });
export const second = () => go(found(), { is: "asks", questions: more });
export const drafted = () => go(second(), { is: "drafted", draft, cases: cases10 });
export const judge = (w: Walkthrough, n: number) =>
  Array.from({ length: n }).reduce<Walkthrough>(
    (now, _, i) => go(now, { is: "judged", case: `k${i + 1}`, said: i % 2 === 0 ? "right" : "wrong" }),
    w,
  );
