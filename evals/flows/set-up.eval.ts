import { describe, expect, it } from "vitest";
import type { Files } from "~/modules/playbook/types.ts";
import type { WalkEvent } from "~/modules/walkthrough/types.ts";
import { crash, flow, until, type Flow } from "./kit.ts";
import { ready } from "./ready.ts";

/** Setting up a manager from a sentence. The model says what it wants with `set_up`; code says whether that may be. */
const OBJECTIVE = {
  said: "Fewer bugs that sit",
  measure: { counts: "Bugs closed", unit: "a week", better: "more", read: { from: "connector", account: "github", query: "closed bugs" }, settles: "7d", before: { unknown: "Nobody counted" } },
  aim: { value: 5, by: "2027-02-28" },
  notWorse: [],
  owner: "Ama",
} as const;
const question = (id: string) => ({ id, ask: `What about ${id}?`, picks: ["Yes", "No"], best: "No", because: "Only you know", changes: ["workflow/bug"] });
const tells = (...events: readonly object[]) =>
  events.map((event, at) => (at === 0 ? { tool: "set_up", start: true as const, do: { call: "set_up", args: { event } as never } } : { after: "set_up", do: { call: "set_up", args: { event } as never } }));

async function juno(f: Flow, ...events: readonly object[]): Promise<void> {
  await f.ama.done("models.default", { connection: f.connection, model: f.models.juno, thinking: "low" });
  await f.script(f.models.juno, tells(...events));
}
const start = async (f: Flow) => (await f.ama.write("/set-up", { said: "Fewer bugs that sit" })).walk;
const at = (f: Flow, walk: string, stage: string) =>
  until(null, () => f.ama.see("/set-up/:walk", { walk }), (view) => view.walk.stage === stage, `the set-up is at ${stage}`);
const says = (f: Flow, walk: string, event: WalkEvent) => f.ama.write("/set-up/:walk", event, { walk });

/** To the draft: one round of questions, nothing to connect, a playbook that is right, ten cases. */
async function drafted(f: Flow) {
  const { manager } = await ready(f);
  const { files } = await f.ama.see("/m/:manager/playbook?version", { manager });
  const draft: Files = Object.fromEntries(Object.entries(files).map(([path, body]) => [path, body.replaceAll("Coding", "Bugs")]));
  const cases = Array.from({ length: 10 }, (_, n) => ({ id: `c${n}`, what: `Issue ${n}`, would: "Take it on", happened: "It sat" }));
  await juno(f, { is: "measured", objective: OBJECTIVE }, { is: "asks", questions: [question("docs")] });
  const walk = await start(f);
  await at(f, walk, "first questions");
  await f.script(f.models.juno, tells({ is: "drafted", draft, cases }));
  await says(f, walk, { is: "answers", by: "Ama", answers: { docs: "Yes" } });
  await at(f, walk, "draft");
  return { walk, draft, files };
}

describe("setting one up", () => {
  it("flow:set-up/says-it-back-measurably-then-asks-with-answers-of-its-own", async () => {
    const f = await flow();
    await juno(f, { is: "measured", objective: OBJECTIVE }, { is: "asks", questions: [question("docs"), question("weekends")] });
    const walk = await start(f);
    const view = await at(f, walk, "first questions");
    expect(view.walk).toMatchObject({ said: "Fewer bugs that sit", objective: { measure: { counts: "Bugs closed" }, aim: { value: 5 } } });
    for (const one of view.walk.rounds[0]?.questions ?? []) expect(one).toMatchObject({ best: "No", because: expect.any(String), changes: ["workflow/bug"] });
  });
  it("flow:set-up/a-fourth-question-and-one-that-changes-nothing-are-refused-to-the-model", async () => {
    const f = await flow();
    const idle = { ...question("idle"), changes: [] };
    await juno(f, { is: "measured", objective: OBJECTIVE }, { is: "asks", questions: ["a", "b", "c", "d"].map(question) }, { is: "asks", questions: [idle] }, { is: "asks", questions: [question("docs")] });
    const walk = await start(f);
    const view = await at(f, walk, "first questions");
    expect(view.walk.rounds.map(({ questions }) => questions.map(({ id }) => id))).toEqual([["docs"]]);
  });
  it("flow:set-up/someone-there-who-could-carry-it-is-proposed-and-nothing-is-made", async () => {
    const f = await flow();
    const { manager } = await ready(f);
    await juno(f, { is: "measured", objective: OBJECTIVE }, { is: "could carry", manager, change: "Count bugs closed" });
    const walk = await start(f);
    await at(f, walk, "carried by another");
    expect((await f.ama.see("/tree")).rows.filter(({ id }) => id !== manager && id !== "coworker").length).toBe(0);
    const { comments } = await f.ama.see("/m/:manager/playbook?version", { manager });
    expect(JSON.stringify(comments)).toContain("Count bugs closed");
  });
  it("flow:set-up/nothing-is-made-before-ten-are-judged-and-a-yes", async () => {
    const f = await flow();
    const { walk } = await drafted(f);
    expect(await says(f, walk, { is: "make it", by: "Ama" })).toMatchObject({ _tag: "Refused" });
    for (let n = 0; n < 9; n++) await says(f, walk, { is: "judged", case: `c${n}`, said: "right" });
    expect(await says(f, walk, { is: "make it", by: "Ama" })).toMatchObject({ _tag: "Refused" });
    expect((await f.ama.see("/shell")).tree).toHaveLength(1);
    await says(f, walk, { is: "judged", case: "c9", said: "wrong" });
    await says(f, walk, { is: "make it", by: "Ama" });
    const { walk: made } = await at(f, walk, "made");
    const view = await f.ama.see("/m/:manager/playbook?version", { manager: made.made ?? "" });
    expect(view.problems).toEqual([]);
    expect(view.evals.reduce((sum, { eval: one }) => sum + one.cases.length, 0)).toBeGreaterThanOrEqual(10);
  });
  it("flow:set-up/an-edit-is-you-said-and-the-rest-keeps-its-why", async () => {
    const f = await flow();
    const { walk, draft } = await drafted(f);
    const edited = { ...draft, "agents/doer.md": `${draft["agents/doer.md"]}\nNever on a Friday.\n` };
    await says(f, walk, { is: "edited", draft: edited, lines: ["agents/doer"], by: "Ama" });
    const { walk: now } = await f.ama.see("/set-up/:walk", { walk });
    expect(now.draft?.["agents/doer.md"]).toContain("Never on a Friday.");
    expect(now.draft?.["because.yaml"]).toMatch(/agents\/doer"?:\s*\{?\s*why: "?you said/u);
  });
  it("flow:set-up/a-draft-with-a-problem-goes-back-to-the-model-with-the-line", async () => {
    const f = await flow();
    const { manager } = await ready(f);
    const { files } = await f.ama.see("/m/:manager/playbook?version", { manager });
    const cases = Array.from({ length: 10 }, (_, n) => ({ id: `c${n}`, what: `Issue ${n}`, would: "Take it on", happened: "It sat" }));
    const wrong = { ...files, "workflow.yaml": (files["workflow.yaml"] ?? "").replaceAll("agent: doer", "agent: nobody") };
    await juno(f, { is: "measured", objective: OBJECTIVE }, { is: "asks", questions: [question("docs")] });
    const walk = await start(f);
    await at(f, walk, "first questions");
    await f.script(f.models.juno, tells({ is: "drafted", draft: wrong, cases }, { is: "drafted", draft: files, cases }));
    await says(f, walk, { is: "answers", by: "Ama", answers: {} });
    const { walk: now } = await at(f, walk, "draft");
    expect(now.draft?.["workflow.yaml"]).not.toContain("nobody");
    expect((await f.seen(f.models.juno)).at(-1)?.told).toMatch(/workflow\.yaml[\s\S]*nobody|nobody[\s\S]*workflow/u);
  });
  it("flow:set-up/read-access-ends-when-it-is-thrown-away", async () => {
    const f = await flow();
    await juno(f, { is: "measured", objective: OBJECTIVE }, { is: "asks", questions: [question("docs")] });
    const walk = await start(f);
    await at(f, walk, "first questions");
    await f.script(f.models.juno, tells({ is: "wants", wants: [{ connector: "github", reads: "Issues of 30 days", tells: "What sits", without: "How long bugs sit" }] }));
    await says(f, walk, { is: "answers", by: "Ama", answers: {} });
    await at(f, walk, "connect");
    await f.repo();
    await says(f, walk, { is: "connected", connector: "github" });
    await says(f, walk, { is: "throw away", by: "Ama" });
    const { walk: now } = await at(f, walk, "thrown away");
    expect(now.wants).toMatchObject([{ connector: "github", state: "ended" }]);
    expect((await f.ama.see("/shell")).tree).toEqual([]);
  });
  it("flow:set-up/a-crash-keeps-where-it-was", async () => {
    const f = await flow();
    const { walk } = await drafted(f);
    await says(f, walk, { is: "judged", case: "c0", said: "right" });
    await crash();
    const { walk: now } = await f.ama.see("/set-up/:walk", { walk });
    expect(now.stage).toBe("draft");
    expect(now.cases[0]?.said).toBe("right");
  });
  it("flow:set-up/a-member-may-not-make-one", async () => {
    const f = await flow();
    const { walk } = await drafted(f);
    const chidi = await f.joins("Chidi", "Member");
    const answer = await chidi.browser.send("POST", `/api/ws/${chidi.workspace}/set-up/${walk}`, { is: "make it", by: "Chidi" });
    expect(answer.status === 403 || ((await answer.json()) as { _tag?: string })._tag === "Refused").toBe(true);
  });
});
