import { describe, expect, it } from "vitest";
import { DAY, flow, pass, quiet, until, type Flow } from "./kit.ts";
import { asks, ready, waiting, workOf } from "./ready.ts";
import { builds, fixes, saysDone } from "./scripts.ts";

/** What waits for a person: in the inbox, and where it was asked. */
async function asked(f: Flow) {
  const made = await ready(f);
  const question = { question: "Add or multiply?", options: ["Add", "Multiply"], best: "Add" };
  await f.script(f.models.doer, [{ tool: "ask", start: true, do: { call: "ask", args: question } }, { after: "ask", do: { call: "done_when", args: { checks: [{ id: "fixed", says: "It adds", by: "agent" }] } } }, ...fixes.slice(1)]);
  await asks(f, made.repo);
  const [ask] = await until(made.repo, () => waiting(f.ama), (all) => all.length === 1, "Ama is asked");
  if (ask === undefined) throw new Error("nothing was asked");
  return { ...made, ask };
}
const answer = (f: Flow, id: string, with_: string) => f.ama.write("/inbox/:ask", { answer: with_ }, { ask: id });

describe("an ask", () => {
  it("flow:asks/says-what-it-is-about-its-options-its-best-and-by-when", async () => {
    const f = await flow();
    const { ask, manager } = await asked(f);
    expect(ask).toMatchObject({ question: "Add or multiply?", about: { manager, title: expect.stringContaining("add.sh") }, by: expect.any(Number) });
    expect(ask.options.map(({ label }) => label)).toEqual(expect.arrayContaining(["Add", "Multiply"]));
    expect(ask.options.find(({ id }) => id === ask.best)?.label).toBe("Add");
    expect((await f.ama.see("/shell")).inbox).toBe(1);
  });
  it("flow:asks/is-asked-where-the-work-was-asked-too", async () => {
    const f = await flow();
    const { repo } = await asked(f);
    expect((await until(repo, () => repo.said(1), (said) => said.some((text) => text.includes("Add or multiply?")), "it is on the issue")).length).toBeGreaterThan(0);
  });
  it("flow:asks/an-answer-in-the-inbox-goes-on-and-leaves-the-inbox", async () => {
    const f = await flow();
    const { repo, ask } = await asked(f);
    expect(await answer(f, ask.id, ask.best ?? "")).toMatchObject({ _tag: "Answered" });
    await until(repo, () => f.seen(f.models.doer), (seen) => seen.some(({ did }) => did.startsWith("done_when")), "it went on");
    expect(await waiting(f.ama)).toEqual([]);
  });
  it("flow:asks/an-answer-on-github-answers-it-here", async () => {
    const f = await flow();
    const { repo, ask } = await asked(f);
    await repo.does("comment", { by: f.ama.login, number: 1, text: "@juno-test Add" });
    await until(repo, () => waiting(f.ama), (all) => all.length === 0, "the inbox is empty");
    expect(await answer(f, ask.id, ask.best ?? "")).toMatchObject({ _tag: "Late", says: expect.any(String) });
  });
  it("flow:asks/the-second-answer-is-told-it-was-late", async () => {
    const f = await flow();
    const { ask } = await asked(f);
    await answer(f, ask.id, ask.options[0]?.id ?? "");
    expect(await answer(f, ask.id, ask.options[1]?.id ?? "")).toMatchObject({ _tag: "Late" });
  });
  it("flow:asks/someone-it-is-not-for-may-not-answer", async () => {
    const f = await flow();
    const { ask } = await asked(f);
    const chidi = await f.joins("Chidi", "Member");
    expect(await chidi.write("/inbox/:ask", { answer: ask.best ?? "" }, { ask: ask.id })).toMatchObject({ _tag: "Refused" });
    expect(await waiting(chidi)).toEqual([]);
  });
  it("flow:asks/silence-reminds-once-and-never-approves", async () => {
    const f = await flow();
    const { repo, ask, manager } = await asked(f);
    await pass(f.ama, 3 * DAY);
    await quiet(repo, () => repo.said(1));
    const { items } = await f.ama.see("/inbox");
    const now = items.find((one) => one.ask.id === ask.id)?.ask;
    expect(now).toMatchObject({ state: { _tag: "Open" }, reminded: 1 });
    const { cards } = await f.ama.see("/m/:manager/board", { manager });
    expect((await workOf(f, manager, cards[0]?.work.id ?? "")).work).toMatchObject({ ended: null, waits: { ask: ask.id } });
  });
  it("flow:asks/other-work-goes-on-while-one-waits", async () => {
    const f = await flow();
    const { repo } = await asked(f);
    await f.script(f.models.doer, [...saysDone, ...builds()]);
    await repo.does("issue", { by: f.ama.login, title: "another one", body: "add.sh", labels: ["juno"] });
    await until(repo, () => f.seen(f.models.doer), (seen) => seen.some(({ did }) => did.startsWith("report")), "the other one goes on");
    expect(await waiting(f.ama)).toHaveLength(1);
  });
  it("flow:asks/a-crash-while-it-waits-loses-nothing", async () => {
    const f = await flow();
    const { repo, ask } = await asked(f);
    const { crash } = await import("./kit.ts");
    await crash();
    expect(await answer(f, ask.id, ask.best ?? "")).toMatchObject({ _tag: "Answered" });
    await until(repo, () => f.seen(f.models.doer), (seen) => seen.some(({ did }) => did.startsWith("done_when")), "it went on");
  });
  it("flow:asks/always-for-this-kind-is-a-rule-and-is-not-asked-again", async () => {
    const f = await flow();
    const { repo } = await ready(f);
    const closes = { after: "github_open_pull_request", tool: "github_rerun_checks", do: { call: "github_rerun_checks", args: {} } };
    await f.script(f.models.doer, [...fixes, closes, ...fixes, closes]);
    await asks(f, repo);
    const [ask] = await until(repo, () => waiting(f.ama), (all) => all.length === 1, "it asks");
    await f.ama.write("/inbox/:ask", { answer: ask?.options[0]?.id ?? "", always: "kind" }, { ask: ask?.id ?? "" });
    await repo.does("issue", { by: f.ama.login, title: "add.sh subtracts again", body: "y", labels: ["juno"] });
    await until(repo, () => repo.pulls(), (pulls) => pulls.length === 2, "the second pull request");
    await quiet(repo, () => repo.pulls());
    expect(await waiting(f.ama)).toEqual([]);
  });
});
