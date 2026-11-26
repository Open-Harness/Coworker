import { describe, expect, it } from "vitest";
import type { NewAsk, Rule } from "~/modules/asks/types.ts";
import { createAsking } from "./service.ts";
import type { AskStore, Kept, OpenAsk } from "./types.ts";

const DAY = 86_400_000;

function world() {
  const kept = new Map<string, Kept>();
  const rules: Rule[] = [];
  const told: string[] = [];
  const state = { now: 1_000, up: true };
  const store: AskStore = {
    get: (id) => kept.get(id),
    put: (one) => void kept.set(one.ask.id, one),
    open: () => [...kept.values()].filter(({ ask }) => ask.state._tag === "Open"),
    untold: () => [...kept.values()].filter(({ ask, told: was }) => ask.state._tag === "Answered" && !was),
    rules: () => rules,
    putRule: (rule) => void rules.push(rule),
  };
  let n = 0;
  const asking = createAsking({
    store,
    clock: { now: () => state.now },
    ids: { next: (prefix) => `${prefix}_${(n += 1)}` },
    tell: async (one) => {
      if (state.up) told.push(one.ask.id);
      return state.up;
    },
  });
  return { asking, state, told, rules, kept };
}

const base = (over: Partial<NewAsk> = {}): NewAsk => ({
  id: "ask_1",
  to: "ama",
  need: "decide",
  about: { work: "work_1", thread: "github:acme/web#1", manager: "mgr_1", title: "add.sh subtracts" },
  question: "Add or multiply?",
  why: "It asked.",
  options: [
    { id: "add", label: "Add", then: "Goes on with add." },
    { id: "multiply", label: "Multiply", then: "Goes on with multiply." },
  ],
  best: "add",
  shows: null,
  by: 1_000 + DAY,
  then: [],
  else: "wait",
  ...over,
});
const input = (ask: NewAsk = base()): OpenAsk => ({
  ask,
  from: "Coding",
  kind: "bug",
  person: "ama",
  looked: [],
  otherwise: null,
  links: [],
});
const ama = { id: "ama", name: "Ama", role: "Owner" } as const;

describe("asking", () => {
  it("opens an ask once by its id, and it waits in the inbox of the one asked and no one else", async () => {
    const { asking } = world();
    await asking.handle({ op: "open", input: input() });
    const again = await asking.handle({ op: "open", input: input(base({ question: "Something else?" })) });
    expect(again).toMatchObject({ isNew: false, asked: { ask: { question: "Add or multiply?" } } });
    expect(await asking.handle({ op: "inbox", person: "ama" })).toMatchObject({ items: [{ from: "Coding" }] });
    expect(await asking.handle({ op: "inbox", person: "chidi" })).toMatchObject({ items: [] });
  });

  it("is answered once, told once, and the second answer is told it was late", async () => {
    const { asking, told } = world();
    await asking.handle({ op: "open", input: input() });
    const first = await asking.handle({ op: "answer", ask: "ask_1", by: ama, answer: "add" });
    const second = await asking.handle({ op: "answer", ask: "ask_1", by: ama, answer: "multiply" });
    expect(first).toMatchObject({ answered: { _tag: "Answered" } });
    expect(second).toMatchObject({ answered: { _tag: "Late" } });
    expect(told).toEqual(["ask_1"]);
  });

  it("is not for a member who is not asked, but for an Owner who is not", async () => {
    const { asking } = world();
    await asking.handle({ op: "open", input: input() });
    const member = { id: "chidi", name: "Chidi", role: "Member" } as const;
    expect(await asking.handle({ op: "answer", ask: "ask_1", by: member, answer: "add" })).toMatchObject({ answered: { _tag: "Refused" } });
    const owner = { id: "bo", name: "Bo", role: "Owner" } as const;
    expect(await asking.handle({ op: "answer", ask: "ask_1", by: owner, answer: "add" })).toMatchObject({ answered: { _tag: "Answered" } });
  });

  it("is answered by a comment that says an option, and only by whom it is for", async () => {
    const { asking, kept } = world();
    await asking.handle({ op: "open", input: input() });
    const said = { thread: "github:acme/web#1", name: "ama-login", person: null, mayAct: true };
    expect(await asking.heard({ ...said, text: "@juno-test Add" })).toEqual({ ask: "ask_1", work: "work_1" });
    expect(kept.get("ask_1")?.ask.state).toMatchObject({ _tag: "Answered", where: "github", answer: "add" });
    expect(await asking.heard({ ...said, text: "@juno-test Multiply" })).toBeUndefined();
  });

  it("does not take a comment that says nothing it offered, or from a stranger", async () => {
    const { asking } = world();
    await asking.handle({ op: "open", input: input() });
    const said = { thread: "github:acme/web#1", name: "x", person: null, mayAct: true };
    expect(await asking.heard({ ...said, text: "Subtract." })).toBeUndefined();
    expect(await asking.heard({ ...said, text: "Add", mayAct: false })).toBeUndefined();
    expect(await asking.heard({ ...said, text: "Add", person: "chidi" })).toBeUndefined();
  });

  it("reminds once after its date, whatever time passes, and never answers for the person", async () => {
    const { asking, state } = world();
    await asking.handle({ op: "open", input: input() });
    state.now += 3 * DAY;
    await asking.tick();
    expect(await asking.handle({ op: "inbox", person: "ama" })).toMatchObject({
      items: [{ ask: { reminded: 1, state: { _tag: "Open" } } }],
    });
    await asking.tick();
    expect(await asking.handle({ op: "inbox", person: "ama" })).toMatchObject({ items: [{ ask: { reminded: 1 } }] });
  });

  it("goes to a stand-in after the reminder, and does what it says without an answer only when it says so", async () => {
    const { asking, state, kept } = world();
    await asking.handle({ op: "open", input: input(base({ then: ["bo"], else: { option: "add" } })) });
    state.now += 2 * DAY;
    await asking.tick();
    await asking.tick();
    expect(await asking.handle({ op: "inbox", person: "bo" })).toMatchObject({ items: [{ ask: { id: "ask_1" } }] });
    await asking.tick();
    expect(kept.get("ask_1")?.ask.state).toMatchObject({ _tag: "Answered", where: "silence", answer: "add" });
  });

  it("tells again what could not be told, and loses nothing", async () => {
    const { asking, state, told } = world();
    await asking.handle({ op: "open", input: input() });
    state.up = false;
    await asking.handle({ op: "answer", ask: "ask_1", by: ama, answer: "add" });
    expect(told).toEqual([]);
    state.up = true;
    await asking.tick();
    expect(told).toEqual(["ask_1"]);
    await asking.tick();
    expect(told).toEqual(["ask_1"]);
  });

  it("makes a rule from an approved action, once, and a rule covers only what it says", async () => {
    const { asking, rules } = world();
    const shows = { action: "github.rerun_checks", where: "github:acme/web#1", text: "Run the checks again." };
    const yes = [
      { id: "yes", label: "Yes, do it", then: "Done." },
      { id: "no", label: "No", then: "Not done." },
    ];
    const approve = (id: string) => input(base({ id, need: "approve", options: yes, best: null, shows }));
    await asking.handle({ op: "open", input: approve("ask_a") });
    await asking.handle({ op: "answer", ask: "ask_a", by: ama, answer: "yes", always: "kind" });
    await asking.handle({ op: "open", input: approve("ask_b") });
    await asking.handle({ op: "answer", ask: "ask_b", by: ama, answer: "yes", always: "kind" });
    expect(rules).toHaveLength(1);
    const use = { action: "github.rerun_checks", thread: "github:acme/web#9", person: "pat", kind: "bug" };
    expect(await asking.handle({ op: "covered", use })).toEqual({ op: "covered", is: true });
    expect(await asking.handle({ op: "covered", use: { ...use, kind: "feature" } })).toEqual({ op: "covered", is: false });
    expect(await asking.handle({ op: "covered", use: { ...use, action: "github.merge" } })).toEqual({ op: "covered", is: false });
  });

  it("is not asked any more when its work ended", async () => {
    const { asking } = world();
    await asking.handle({ op: "open", input: input() });
    await asking.handle({ op: "gone", work: "work_1", why: "The work was stopped." });
    expect(await asking.handle({ op: "inbox", person: "ama" })).toMatchObject({ items: [] });
    expect(await asking.handle({ op: "answer", ask: "ask_1", by: ama, answer: "add" })).toMatchObject({ answered: { _tag: "Refused" } });
  });
});
