import { describe, expect, it } from "vitest";
import { crash, flow, post, quiet, until, type Flow, type Repo } from "./kit.ts";
import { asks, pulled, ready } from "./ready.ts";
import { DONE_WHEN, fixes, takes } from "./scripts.ts";

/** Journey 1 to 4: an issue becomes one pull request. */
describe("asked on an issue", () => {
  it("flow:repo/a-label-becomes-a-pull-request", async () => {
    const f = await flow();
    const { repo, manager } = await ready(f);
    await asks(f, repo);
    const [pull] = await pulled(repo);
    expect(pull.body).toMatch(/(?:closes|fixes|resolves) #1/iu);
    expect((await repo.does("file", { branch: pull.pull.head.ref, path: "add.sh" })).text).toBe("echo $(($1 + $2))");
    const { cards } = await f.ama.see("/m/:manager/board", { manager });
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ kindName: "Bug", doneWhen: { of: expect.any(Number) } });
    expect(cards[0]?.work.next).toMatchObject({ by: expect.any(Number) });
  });

  it("flow:repo/a-mention-asks-too", async () => {
    const f = await flow();
    const { repo } = await ready(f);
    await asks(f, repo, { labels: [] });
    await repo.deliver();
    await repo.does("comment", { by: f.ama.login, number: 1, text: "@juno-test can you take this?" });
    expect(await pulled(repo)).toHaveLength(1);
  });

  it("flow:repo/says-what-done-means-on-the-issue-first", async () => {
    const f = await flow();
    const { repo } = await ready(f);
    await asks(f, repo);
    await until(repo, () => repo.said(1), (said) => said.some((text) => text.includes(DONE_WHEN)), "the issue says what done means");
    const calls = (await pulled(repo)) && (await repo.look()).calls;
    const at = (path: RegExp, method = "POST") => calls.findIndex((call) => call.method === method && path.test(call.path));
    expect(at(/issues\/1\/comments$/u)).toBeGreaterThanOrEqual(0);
    expect(at(/issues\/1\/comments$/u)).toBeLessThan(at(/pulls$/u));
  });

  it("flow:repo/a-pull-request-says-what-and-how-it-was-tested", async () => {
    const f = await flow();
    const { repo } = await ready(f);
    await asks(f, repo);
    const [pull] = await pulled(repo);
    expect(pull).toMatchObject({ title: "Add, do not subtract", body: expect.stringContaining("Tested with sh test.sh") });
    expect(pull.pull.base.ref).toBe("main");
    expect(pull.pull.head.ref).not.toBe("main");
  });

  it("flow:repo/no-token-that-can-write-is-in-a-box-or-a-prompt", async () => {
    const f = await flow();
    const { repo } = await ready(f);
    await f.script(f.models.doer, [{ tool: "bash", start: true, sees: "Make the change", do: { call: "bash", args: { command: "env; git remote -v; cat .git/config" } } }, ...fixes]);
    await asks(f, repo);
    await pulled(repo);
    const { boxes } = await repo.look();
    expect(boxes.length).toBeGreaterThan(0);
    for (const box of boxes) {
      expect(Object.values(box.token ?? {})).not.toContain("write");
      expect(JSON.stringify([box.env, box.ran])).not.toMatch(/ghs_|PRIVATE KEY|flows-key|flows-webhook/u);
    }
    for (const model of Object.values(f.models))
      for (const { told } of await f.seen(model)) expect(told).not.toMatch(/ghs_|PRIVATE KEY|flows-key-that-works|flows-webhook-secret/u);
  });

  it("flow:repo/a-thread-starts-from-the-page-the-agent-the-work-and-the-issue", async () => {
    const f = await flow();
    const { repo } = await ready(f);
    await asks(f, repo);
    await pulled(repo);
    const [first] = await f.seen(f.models.doer);
    expect(first?.told).toContain("sh add.sh 1 2 answers -1");
    expect(first?.told).toContain("Read before you write.");
    expect(first?.told).toContain("Read the issue and the code it is about");
    const { playbook } = await f.ama.see("/m/:manager/playbook?version", { manager: (await f.ama.see("/shell")).tree.find(({ name }) => name === "Coding")?.id ?? "" });
    expect(playbook.agents.length).toBe(3);
  });

  it("flow:repo/the-same-delivery-twice-is-one-piece-of-work", async () => {
    const f = await flow();
    const { repo, manager } = await ready(f);
    await asks(f, repo);
    const { deliveries } = await repo.does<{ deliveries: any[] }>("deliveries");
    for (const one of [...deliveries, ...deliveries]) await post(one);
    await pulled(repo);
    await quiet(repo, () => repo.pulls());
    expect(await repo.pulls()).toHaveLength(1);
    expect((await f.ama.see("/m/:manager/board", { manager })).cards).toHaveLength(1);
  });

  it("flow:repo/what-is-not-signed-is-refused-and-kept-nowhere", async () => {
    const f = await flow();
    const { repo, manager } = await ready(f);
    await asks(f, repo);
    const { deliveries } = await repo.does<{ deliveries: any[] }>("deliveries");
    expect((await post(deliveries[0], "another-secret")).status).toBe(401);
    expect((await f.ama.see("/m/:manager/intake?from&state&before", { manager })).rows).toEqual([]);
  });
});

describe("a crash loses nothing and does nothing twice", () => {
  const AFTER: readonly [string, (repo: Repo, f: Flow) => Promise<unknown>][] = [
    ["it-came-in", async (repo) => repo.deliver()],
    ["done-was-said", (repo) => until(repo, () => repo.said(1), (said) => said.length > 0, "a comment")],
    ["it-built", (repo) => until(repo, async () => (await repo.look()).boxes.flatMap((box) => box.ran), (ran) => ran.some((one: any) => one.command.includes("add.sh")), "a command ran")],
    ["it-was-checked", (repo, f) => until(repo, () => f.seen(f.models.reviewer), (seen) => seen.length > 0, "the reviewer was asked")],
    ["the-pull-request-opened", pulled],
  ];
  it.each(AFTER)("flow:repo/crash-after-%s", async (_name, happens) => {
    const f = await flow();
    const { repo, manager } = await ready(f);
    await asks(f, repo);
    await happens(repo, f);
    await crash();
    await pulled(repo);
    await quiet(repo, () => repo.pulls());
    const { issues } = await repo.look();
    expect(issues.filter((one) => one.pull !== undefined)).toHaveLength(1);
    expect(issues[0].comments.filter((one: any) => one.body.includes(DONE_WHEN))).toHaveLength(1);
    expect((await f.ama.see("/m/:manager/board", { manager })).cards).toHaveLength(1);
  });
});

describe("any number of managers", () => {
  it("flow:repo/two-managers-two-repos-two-models-neither-sees-the-other", async () => {
    const f = await flow();
    const one = await ready(f);
    const two = await f.repo(undefined, { installation: one.repo.installation });
    const second = await f.manager(two, { name: "API", doer: `${f.connection} ${f.models.juno} high` });
    await f.script(f.models.judge, [{ ...takes(second), sees: "another repo" }, takes(one.manager)]);
    await f.script(f.models.juno, fixes);
    await asks(f, one.repo);
    await pulled(one.repo);
    await two.does("issue", { by: f.ama.login, title: "another repo is wrong", body: "also", labels: ["juno"] });
    await until(two, () => two.pulls(), (pulls) => pulls.length === 1, "the second manager's pull request");
    for (const { told } of await f.seen(f.models.juno)) expect(told).not.toContain("add.sh subtracts");
    for (const { told } of await f.seen(f.models.doer)) expect(told).not.toContain("another repo is wrong");
    expect((await f.seen(f.models.juno)).map(({ thinking }) => thinking)).toContain("high");
    expect((await f.ama.see("/m/:manager/board", { manager: second })).cards).toHaveLength(1);
  });

  it("flow:repo/what-it-cost-is-on-the-work", async () => {
    const f = await flow({ price: { prompt: "0.000003", completion: "0.000015" } });
    const { repo, manager } = await ready(f);
    await asks(f, repo);
    await pulled(repo);
    const calls = (await f.seen(f.models.doer)).length + (await f.seen(f.models.reviewer)).length + (await f.seen(f.models.judge)).length;
    const { cards } = await f.ama.see("/m/:manager/board", { manager });
    // 1000 in and 200 out, each call: $0.006.
    expect(cards[0]?.work.cost).toBeGreaterThan(0.006);
    expect(cards[0]?.work.cost).toBeLessThanOrEqual(calls * 0.006 + 0.1);
    expect((await f.ama.see("/settings/usage")).models.find(({ model }) => model === f.models.doer)).toMatchObject({ notKnown: 0 });
  });

  it("flow:repo/a-price-not-known-is-said-and-not-zero", async () => {
    const f = await flow();
    const { repo } = await ready(f);
    await asks(f, repo);
    await pulled(repo);
    const used = (await f.ama.see("/settings/usage")).models.find(({ model }) => model === f.models.doer);
    expect(used?.notKnown).toBeGreaterThan(0);
  });
});
