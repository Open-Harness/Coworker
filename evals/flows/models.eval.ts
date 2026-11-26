import { describe, expect, it } from "vitest";
import { flow, quiet, until, world } from "./kit.ts";
import { asks, pulled, ready, waiting } from "./ready.ts";
import { fixes } from "./scripts.ts";

/** Which model answers, and what it may cost. */
const DEAR = { prompt: "0.001", completion: "0.005" };

describe("the model is chosen", () => {
  it("flow:models/each-agent-has-its-own-with-its-thinking", async () => {
    const f = await flow();
    const { repo } = await ready(f, {});
    await asks(f, repo);
    await pulled(repo);
    expect((await f.seen(f.models.judge)).length).toBe(1);
    expect((await f.seen(f.models.reviewer)).length).toBeGreaterThan(0);
    for (const { thinking } of await f.seen(f.models.doer)) expect(thinking).toBe("low");
  });
  it("flow:models/inherit-means-the-manager's-else-the-workspace's", async () => {
    const f = await flow();
    const { repo, manager } = await ready(f, { doer: "inherit", reviewer: "inherit" });
    const view = await f.ama.see("/m/:manager/playbook?version", { manager });
    expect(view.agents.find(({ agent }) => agent.id === "doer")).toMatchObject({ model: f.models.doer, from: "workspace" });
    await f.ama.done("manager.settings", { manager, model: f.models.juno, thinking: "low", connection: f.connection });
    expect((await f.ama.see("/m/:manager/playbook?version", { manager })).agents.find(({ agent }) => agent.id === "doer")).toMatchObject({ model: f.models.juno, from: "manager" });
    await f.script(f.models.juno, fixes);
    await asks(f, repo);
    await until(repo, () => f.seen(f.models.juno), (seen) => seen.length > 0, "the manager's model is asked");
    expect(await f.seen(f.models.doer)).toEqual([]);
  });
  it("flow:models/one-that-stopped-working-waits-and-asks-and-goes-on-when-it-is-back", async () => {
    const f = await flow();
    const { repo } = await ready(f);
    await world("/turn", { model: f.models.doer, is: "off" });
    await asks(f, repo);
    const [ask] = await until(repo, () => waiting(f.ama), (all) => all.length > 0, "Ama is asked about the model", 40_000);
    expect(ask?.question).toMatch(/model/iu);
    expect(JSON.stringify(ask)).toContain(f.models.doer);
    await world("/turn", { model: f.models.doer, is: "on" });
    await f.ama.write("/inbox/:ask", { answer: ask?.best ?? ask?.options[0]?.id ?? "" }, { ask: ask?.id ?? "" });
    expect(await pulled(repo)).toHaveLength(1);
  });
});

describe("money", () => {
  it("flow:models/over-its-limit-work-stops-asks-and-keeps-what-it-made", async () => {
    const f = await flow({ price: DEAR });
    // Each call is $2: 1000 in at 0.001 and 200 out at 0.005.
    const { repo, manager } = await ready(f, { perWork: "5" });
    await asks(f, repo);
    const [ask] = await until(repo, () => waiting(f.ama), (all) => all.length > 0, "Ama is asked about the limit");
    expect(JSON.stringify(ask)).toMatch(/\$5|5 dollars|limit/iu);
    const calls = (await f.seen(f.models.doer)).length;
    await quiet(repo, () => repo.pulls(), 2500);
    expect((await f.seen(f.models.doer)).length).toBe(calls);
    const { cards } = await f.ama.see("/m/:manager/board", { manager });
    expect(cards[0]?.work.cost).toBeLessThanOrEqual(8);
  });
  it("flow:models/over-its-day-a-manager-takes-nothing-on-and-keeps-what-came-in", async () => {
    const f = await flow({ price: DEAR });
    const { repo, manager } = await ready(f, { perDay: "3", perWork: "3" });
    await asks(f, repo);
    await until(repo, () => waiting(f.ama), (all) => all.length > 0, "the day's limit is reached");
    await repo.does("issue", { by: f.ama.login, title: "another", body: "one", labels: ["juno"] });
    const { rows } = await until(repo, () => f.ama.see("/m/:manager/intake?from&state&before", { manager }), (view) => view.rows.some(({ item }) => item.title === "another"), "it is kept");
    const second = rows.find(({ item }) => item.title === "another")?.decision;
    // A day that is spent makes taking it on an ask, who says whether to go on (intake README), not a refusal and not silence.
    expect(second).toMatchObject({ _tag: "Asked", between: [{ manager, kind: "bug" }] });
    const { head } = await f.ama.see("/m/:manager", { manager });
    expect(head.now).toMatch(/limit|\$3/iu);
  });
  it("flow:models/the-day's-money-in-parts-never-adds-up-to-more", async () => {
    const f = await flow();
    const { manager } = await ready(f);
    await f.ama.done("workspace.general", { perDay: 10 });
    expect(await f.ama.act("spending.save", { parts: { [manager]: 11 } })).toMatchObject({ _tag: expect.stringMatching(/Refused|Problems/u) });
    await f.ama.done("spending.save", { parts: { [manager]: 10 } });
    expect((await f.ama.see("/coworker")).spending).toMatchObject({ whole: 10, parts: [{ manager, part: 10 }] });
  });
  it("flow:models/a-key-is-never-in-an-answer-a-log-or-a-prompt", async () => {
    const f = await flow();
    const { repo, manager } = await ready(f);
    await asks(f, repo);
    await pulled(repo);
    const read = await Promise.all(
      (["/shell", "/settings/keys", "/settings/audit-log?by&outcome&before", "/coworker", "/settings/connectors"] as const).map((path) => f.ama.see(path)),
    );
    expect(JSON.stringify([read, await f.ama.see("/m/:manager/threads", { manager })])).not.toMatch(/flows-key-that-works|ghs_|PRIVATE KEY|flows-webhook-secret/u);
  });
});
