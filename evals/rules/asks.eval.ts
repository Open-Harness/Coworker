import { describe, expect, it } from "vitest";
import { asks } from "~/modules/asks/service.ts";
import type { Ask, Due, NewAsk, Reply, Rule } from "~/modules/asks/types.ts";

const at = Date.UTC(2026, 10, 25, 9, 54);
const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const newAsk = (more: Partial<NewAsk> = {}): NewAsk => ({
  id: "ask1",
  to: "bo",
  need: "approve",
  about: { work: "w1", manager: "coding", title: "Merge pull request 412" },
  question: "May I merge pull request 412 into main?",
  why: "CI is green and the check says it is fixed.",
  options: [
    { id: "yes", label: "Merge it", then: "Merges pull request 412" },
    { id: "no", label: "Not yet", then: "Leaves it open" },
  ],
  best: "yes",
  shows: { action: "github.merge", where: "acme/web#412", text: "Merge pull request 412 into main" },
  by: at + DAY,
  then: ["chidi", "ama"],
  else: "wait",
  ...more,
});
const made = (more: Partial<NewAsk> = {}): Ask => {
  const r = asks.ask(newAsk(more), at);
  if (r._tag !== "Asked") throw new Error(`refused: ${r.why}`);
  return r.ask;
};
const reply = (more: Partial<Reply> = {}): Reply => ({ by: "bo", answer: "yes", where: "inbox", at: at + 2 * MIN, may: true, ...more });
const plain = (text: string) => {
  expect(text.trim().length).toBeGreaterThan(0);
  expect(text).not.toMatch(/blocked|pending/iu);
};
const rule = (more: Partial<Rule> = {}): Rule => ({
  id: "r1",
  action: "github.label",
  when: { kind: "bug" },
  by: "bo",
  at,
  right: 3,
  wrong: 1,
  state: "on",
  ...more,
});

describe("asks", () => {
  it("rules:asks/an-ask-is-to-one-person-says-what-and-by-when", () => {
    const r = asks.ask(newAsk(), at);
    expect(r._tag).toBe("Asked");
    if (r._tag !== "Asked") return;
    // It shows exactly what will be sent or done, with its answer options, and by when.
    expect(r.ask).toMatchObject({ ...newAsk(), at, reminded: 0, state: { _tag: "Open" } });
    expect(r.ask.shows).toEqual(newAsk().shows);
    // Every kind of ask there is. Only to know needs no date; the others have one after now.
    for (const need of ["decide", "approve", "do", "review"] as const)
      expect(asks.ask(newAsk({ need, shows: need === "approve" ? newAsk().shows : null }), at)._tag, need).toBe("Asked");
    expect(asks.ask(newAsk({ need: "know", by: null, shows: null, options: [], best: null }), at)._tag).toBe("Asked");
    const refused: readonly [string, Partial<NewAsk>][] = [
      ["no one", { to: "" }],
      ["no one, in spaces", { to: "  " }],
      ["an approve shows nothing", { need: "approve", shows: null }],
      ["no date", { need: "decide", by: null }],
      ["no date for a review", { need: "review", by: null, shows: null }],
      ["a date that has passed", { by: at - 1 }],
      ["a date that is now", { by: at }],
      ["a best that is not an option", { best: "maybe" }],
    ];
    for (const [name, more] of refused) {
      const said = asks.ask(newAsk(more), at);
      expect(said._tag, name).toBe("Refused");
      plain(said._tag === "Refused" ? said.why : "");
    }
    // The same input, the same ask: it makes no id and reads no clock.
    expect(asks.ask(newAsk(), at)).toEqual(asks.ask(newAsk(), at));
    const later = asks.ask(newAsk(), at + 5 * MIN);
    expect(later._tag === "Asked" && later.ask.at).toBe(at + 5 * MIN);
  });

  it("rules:asks/silence-never-approves-else-only-for-decide-and-nothing-outside", () => {
    const decide = newAsk({ need: "decide", shows: null });
    const yes = (more: Partial<NewAsk>) => asks.ask({ ...decide, ...more, else: { option: "no" } }, at)._tag;
    expect(yes({})).toBe("Asked");
    // Only a decide may say what happens without an answer.
    for (const need of ["approve", "do", "review", "know"] as const)
      expect(yes({ need, shows: need === "approve" ? newAsk().shows : null, by: need === "know" ? null : at + DAY }), need).toBe("Refused");
    // And never something that goes outside: what it shows is what is sent.
    expect(yes({ shows: { action: "email.send_outside", where: "pat@northwind.example", text: "Hello" } })).toBe("Refused");
    // An option that is not there is no answer.
    expect(asks.ask({ ...decide, else: { option: "zzz" } }, at)._tag).toBe("Refused");
    const why = asks.ask({ ...decide, else: { option: "zzz" } }, at);
    expect(why._tag === "Refused" && why.why).toMatch(/zzz/u);
    // Seeded: whatever is asked, an ask that is let through and has an else is a decide that shows nothing.
    let seed = 7;
    const rnd = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)] as T;
    let kept = 0;
    for (let i = 0; i < 200; i += 1) {
      const need = pick(["decide", "approve", "do", "review", "know"] as const);
      const shows = rnd() < 0.5 ? null : newAsk().shows;
      const said = asks.ask(
        newAsk({
          need,
          shows,
          by: need === "know" && rnd() < 0.5 ? null : at + DAY,
          else: pick(["wait", { option: "no" }, { option: "yes" }] as const),
        }),
        at,
      );
      if (said._tag !== "Asked") continue;
      kept += 1;
      if (said.ask.else !== "wait") {
        expect(said.ask.need).toBe("decide");
        expect(said.ask.shows).toBeNull();
      }
    }
    expect(kept).toBeGreaterThan(20);
  });

  it("rules:asks/an-answer-answers-it", () => {
    const open = made();
    const frozen = structuredClone(open);
    const r = asks.answer(open, reply({ by: "bo", answer: "no", where: "github", at: at + 9 * MIN }));
    expect(r._tag).toBe("Answered");
    expect(open).toEqual(frozen);
    if (r._tag !== "Answered") return;
    expect(r.ask.state).toEqual({ _tag: "Answered", by: "bo", answer: "no", where: "github", at: at + 9 * MIN });
    expect({ ...r.ask, state: open.state }).toEqual(open);
    // Where it was answered is anywhere: inbox, GitHub, Slack, mail.
    for (const where of ["inbox", "github", "slack", "mail"]) expect(asks.answer(open, reply({ where }))._tag).toBe("Answered");
    // The answer is one of the options, when there are some; free words when there are none.
    for (const answer of ["maybe", "", "  ", "YES"]) {
      const bad = asks.answer(open, reply({ answer }));
      expect(bad._tag, answer).toBe("Refused");
      plain(bad._tag === "Refused" ? bad.why : "");
    }
    const free = made({ need: "do", options: [], best: null, shows: null });
    expect(asks.answer(free, reply({ answer: "I called her, and she is fine." }))._tag).toBe("Answered");
    expect(asks.answer(free, reply({ answer: "" }))._tag).toBe("Refused");
    // An answer after the date still answers it: silence did not.
    expect(asks.answer(open, reply({ at: at + 9 * DAY }))._tag).toBe("Answered");
  });

  it("rules:asks/only-who-may-answer", () => {
    const open = made();
    const frozen = structuredClone(open);
    for (const by of ["bo", "pat", "chidi", "ama"]) {
      const r = asks.answer(open, reply({ by, may: false }));
      expect(r._tag, by).toBe("Refused");
      plain(r._tag === "Refused" ? r.why : "");
      expect(asks.answer(open, reply({ by, may: true }))._tag, by).toBe("Answered");
    }
    expect(open).toEqual(frozen);
    // Whoever may not, not even with a good answer, not even to something already answered.
    const answered = asks.answer(open, reply());
    const done = answered._tag === "Answered" ? answered.ask : open;
    expect(asks.answer(done, reply({ by: "pat", may: false }))._tag).toBe("Refused");
  });

  it("rules:asks/the-second-answer-is-told-it-was-late", () => {
    const first = asks.answer(made(), reply({ by: "ama", answer: "no", where: "github", at: at + 5 * MIN }));
    expect(first._tag).toBe("Answered");
    if (first._tag !== "Answered") return;
    const late = asks.answer(first.ask, reply({ by: "bo", answer: "yes", where: "slack", at: at + 9 * MIN }));
    expect(late._tag).toBe("Late");
    if (late._tag !== "Late") return;
    // What stands is the first answer; the second is told who was first and where.
    expect(late.ask).toEqual(first.ask);
    expect(late.ask.state).toMatchObject({ by: "ama", answer: "no", where: "github" });
    plain(late.says);
    expect(late.says).toMatch(/ama/u);
    expect(late.says).toMatch(/github/u);
    // The same answer twice is late too; and it is never answered again.
    expect(asks.answer(first.ask, reply({ by: "ama", answer: "no", where: "github" }))._tag).toBe("Late");
    // One that is gone is not answered.
    const gone: Ask = { ...made(), state: { _tag: "Gone", why: "The pull request was closed." } };
    const r = asks.answer(gone, reply());
    expect(r._tag).not.toBe("Answered");
    if (r._tag === "Late") expect(r.ask).toEqual(gone);
  });

  it("rules:asks/past-its-date-a-reminder-then-each-stand-in-then-else", () => {
    const run = (ask: Ask, now: number) => {
      const seen: Due[] = [];
      let a = ask;
      for (let i = 0; i < 6; i += 1) {
        seen.push(asks.due(a, now));
        a = { ...a, reminded: a.reminded + 1 };
      }
      return seen;
    };
    const late = at + DAY + 3 * MIN;
    // The person is reminded once, each stand-in is asked in turn, and then nothing, when it waits.
    expect(run(made(), late)).toEqual([
      { _tag: "Remind", person: "bo" },
      { _tag: "StandIn", person: "chidi" },
      { _tag: "StandIn", person: "ama" },
      { _tag: "Nothing" },
      { _tag: "Nothing" },
      { _tag: "Nothing" },
    ]);
    // A decide that says what it does: then that, once.
    const decide = made({ need: "decide", shows: null, else: { option: "no" } });
    expect(run(decide, late)).toEqual([
      { _tag: "Remind", person: "bo" },
      { _tag: "StandIn", person: "chidi" },
      { _tag: "StandIn", person: "ama" },
      { _tag: "Else", option: "no" },
      { _tag: "Nothing" },
      { _tag: "Nothing" },
    ]);
    // No stand-ins: the reminder, then else.
    expect(run(made({ need: "decide", shows: null, then: [], else: { option: "yes" } }), late).slice(0, 3)).toEqual([
      { _tag: "Remind", person: "bo" },
      { _tag: "Else", option: "yes" },
      { _tag: "Nothing" },
    ]);
    // Before its date nothing is due, at any step; so too one that has no date.
    for (const a of [made(), decide]) for (const step of run(a, at + DAY - 3 * MIN)) expect(step).toEqual({ _tag: "Nothing" });
    for (const step of run(made({ need: "know", by: null, shows: null, options: [], best: null }), at + 99 * DAY))
      expect(step).toEqual({ _tag: "Nothing" });
    // Answered or gone: nothing is due, whatever the date.
    const answered = asks.answer(made(), reply());
    if (answered._tag === "Answered") for (const step of run(answered.ask, late)) expect(step).toEqual({ _tag: "Nothing" });
    for (const step of run({ ...made(), state: { _tag: "Gone", why: "x" } }, late)) expect(step).toEqual({ _tag: "Nothing" });
    // Silence never approves: no sequence of waiting, however long, makes anything an answer, or an else it does not have.
    for (const need of ["approve", "do", "review"] as const)
      for (const step of run(made({ need, shows: need === "approve" ? newAsk().shows : null }), at + 400 * DAY))
        expect(step._tag).not.toBe("Else");
  });

  it("rules:asks/whom-it-asks", () => {
    const whom = asks.whom;
    const owners = ["ama", "bo"];
    // Who answers for the work, else who lent the account, else who asked.
    expect(whom({ answers: "chidi", lender: "pat", asked: "zed", away: [], owners })).toBe("chidi");
    expect(whom({ lender: "pat", asked: "zed", away: [], owners })).toBe("pat");
    expect(whom({ asked: "zed", away: [], owners })).toBe("zed");
    expect(whom({ away: [], owners })).toBe("ama");
    // Never who is away, when there is another.
    expect(whom({ answers: "chidi", lender: "pat", asked: "zed", away: ["chidi"], owners })).toBe("pat");
    expect(whom({ answers: "chidi", lender: "pat", asked: "zed", away: ["chidi", "pat"], owners })).toBe("zed");
    expect(whom({ answers: "chidi", lender: "pat", asked: "zed", away: ["chidi", "pat", "zed"], owners })).toBe("ama");
    expect(whom({ answers: "chidi", asked: "zed", away: ["chidi", "zed", "ama"], owners })).toBe("bo");
    expect(whom({ answers: "chidi", away: ["chidi"], owners: [] })).toBe("chidi");
    // Everyone is away: still somebody, the first that would have been asked.
    expect(whom({ answers: "chidi", lender: "pat", away: ["chidi", "pat", "ama", "bo"], owners })).toBe("chidi");
    // Someone away who is not in the list changes nothing.
    expect(whom({ answers: "chidi", away: ["pat"], owners })).toBe("chidi");
  });

  it("rules:asks/always-covers-this-thread-person-or-kind", () => {
    const use = { action: "github.label", thread: "github:acme/web#412", person: "pat", kind: "bug" };
    const rules: readonly [string, Partial<Rule>, boolean][] = [
      ["its kind", { when: { kind: "bug" } }, true],
      ["its person", { when: { person: "pat" } }, true],
      ["its thread", { when: { thread: "github:acme/web#412" } }, true],
      ["another kind", { when: { kind: "feature" } }, false],
      ["another person", { when: { person: "bo" } }, false],
      ["another thread", { when: { thread: "github:acme/web#413" } }, false],
      ["another action", { action: "github.merge" }, false],
      ["taken away", { state: "taken away" }, false],
      ["back to ask", { state: "back to ask" }, false],
    ];
    for (const [name, more, covered] of rules) expect(asks.covers(rule(more), use), name).toBe(covered);
    // A rule for a thread does not cover a person of that name, nor the reverse.
    expect(asks.covers(rule({ when: { person: "bug" } }), use)).toBe(false);
    expect(asks.covers(rule({ when: { kind: "pat" } }), use)).toBe(false);
  });

  it("rules:asks/two-wrong-in-a-row-send-an-always-back-to-ask", () => {
    const r = rule();
    const frozen = structuredClone(r);
    // How often it was right is kept as it goes.
    expect(asks.afterUse(r, true, true)).toEqual({ ...r, right: 4, state: "on" });
    expect(asks.afterUse(r, true, false)).toEqual({ ...r, right: 4, state: "on" });
    expect(asks.afterUse(r, false, true)).toEqual({ ...r, wrong: 2, state: "on" });
    // Wrong after wrong: back to ask, still counted.
    expect(asks.afterUse(r, false, false)).toEqual({ ...r, wrong: 2, state: "back to ask" });
    expect(r).toEqual(frozen);
    // Back to ask stays until a person says otherwise: being right does not undo it, and taken away stays taken away.
    expect(asks.afterUse(rule({ state: "back to ask" }), true, true).state).toBe("back to ask");
    expect(asks.afterUse(rule({ state: "back to ask" }), false, false).state).toBe("back to ask");
    expect(asks.afterUse(rule({ state: "taken away" }), false, false).state).toBe("taken away");
    expect(asks.afterUse(rule({ state: "taken away" }), true, true).state).toBe("taken away");
    // Walk a whole history: it goes back to ask on the first wrong that follows a wrong, and not before.
    const history = [true, true, false, true, false, false, true];
    let walked = rule({ right: 0, wrong: 0 });
    let last = true;
    const states: string[] = [];
    for (const right of history) {
      walked = asks.afterUse(walked, right, last);
      last = right;
      states.push(walked.state);
    }
    expect(states).toEqual(["on", "on", "on", "on", "on", "back to ask", "back to ask"]);
    expect([walked.right, walked.wrong]).toEqual([4, 3]);
  });
});
