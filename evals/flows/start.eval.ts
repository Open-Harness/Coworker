import { describe, expect, it } from "vitest";
import { browser, signUp } from "../../test/flows.ts";
import { flow, Person, until, world } from "./kit.ts";
import { ready } from "./ready.ts";

/** The first steps, one at a time: what every other flow needs. Start here. */
const tag = () => crypto.randomUUID().slice(0, 8);
async function workspace(): Promise<Person> {
  const address = `start-${tag()}`;
  const signed = await signUp(`ama.${address}@example.test`, "Ama");
  const made = (await (await signed.send("POST", "/api/workspaces", { name: "Acme", address, region: "eu" })).json()) as any;
  return new Person(signed, made.workspace.workspaceId, "ama");
}
const connect = (ama: Person) =>
  ama.browser.send("POST", `/api/workspaces/${ama.workspace}/models`, { source: "endpoint", label: "Ours", baseUrl: "https://models.flows.test/v1", key: "flows-key-that-works" });

describe("the console's reads", () => {
  it("flow:start/the-shell-says-who-and-where", async () => {
    const ama = await workspace();
    const shell = await ama.see("/shell");
    expect(shell).toMatchObject({ workspace: { name: "Acme" }, me: { name: "Ama", role: "Owner" }, tree: [], inbox: 0 });
    expect(shell.coworker.name).not.toBe("");
    expect(shell.doings.map(({ id }) => id)).toContain("manager.make");
  });
  it("flow:start/someone-else-sees-nothing", async () => {
    const ama = await workspace();
    const stranger = await signUp(`eve.${tag()}@example.test`, "Eve");
    expect((await new Person(stranger, ama.workspace, "eve").ask("/shell")).status).toBe(404);
    expect((await new Person(browser(), ama.workspace, "nobody").ask("/shell")).status).toBe(401);
  });
  /** Each view has what it is for: one key of its type, so that `{}` or an error body is not an answer. */
  it.each([
    ["/home", "suggestions"],
    ["/inbox", "items"],
    ["/chats", "chats"],
    ["/overview?period", "tiles"],
    ["/tree", "rows"],
    ["/coworker", "identity"],
    ["/templates", "templates"],
    ["/settings/general", "name"],
    ["/settings/members", "people"],
    ["/settings/keys", "models"],
    ["/settings/usage", "days"],
    ["/settings/audit-log?by&outcome&before", "lines"],
    ["/settings/billing", "plan"],
    ["/settings/connectors", "connectors"],
    ["/settings/mcp-servers", "servers"],
    ["/settings/shared", "agents"],
    ["/settings/me", "name"],
  ] as const)("flow:start/a-new-workspace-answers%s", async (path, key) => {
    const ama = await workspace();
    expect(await ama.see(path)).toHaveProperty(key);
  });
  it("flow:start/what-is-not-there-is-404-in-words", async () => {
    const ama = await workspace();
    const answer = await ama.ask("/m/:manager/board", { manager: "nobody" });
    expect(answer.status).toBe(404);
    expect(((await answer.json()) as any).says).toMatch(/[a-z]/u);
  });
});

describe("models", () => {
  it("flow:start/a-connected-endpoint-lists-its-models-and-prices-and-never-its-key", async () => {
    const ama = await workspace();
    const model = `m-${tag()}`;
    await world("/script", { model, rules: [], price: { prompt: "0.000003", completion: "0.000015" } });
    await connect(ama);
    const keys = await ama.see("/settings/keys");
    const found = keys.models[0]?.models.find((one) => one.model === model);
    expect(keys.models[0]).toMatchObject({ label: "Ours", works: true });
    expect(found?.price).toMatchObject({ input: 3, output: 15 });
    expect(JSON.stringify(keys)).not.toContain("flows-key-that-works");
  });
  it("flow:start/the-workspace's-model-is-chosen-by-a-doing", async () => {
    const ama = await workspace();
    const model = `m-${tag()}`;
    await world("/script", { model, rules: [] });
    await connect(ama);
    const connection = (await ama.see("/settings/keys")).models[0]?.id ?? "";
    expect(await ama.act("models.default", { connection, model, thinking: "low" })).toMatchObject({ _tag: "Done" });
    expect((await ama.see("/settings/keys")).choice).toEqual({ connection, model, thinking: "low" });
  });
});

describe("doings", () => {
  it("flow:start/the-same-key-twice-does-it-once", async () => {
    const ama = await workspace();
    const first = await ama.act("workspace.general", { name: "One" }, "k1");
    expect(await ama.act("workspace.general", { name: "Two" }, "k1")).toEqual(first);
    expect((await ama.see("/settings/general")).name).toBe("One");
  });
  it("flow:start/each-is-a-line-in-the-audit-log", async () => {
    const ama = await workspace();
    await ama.done("workspace.general", { name: "Acme Two" });
    const { lines } = await ama.see("/settings/audit-log?by&outcome&before");
    expect(lines[0]).toMatchObject({ by: "Ama", coworker: false, outcome: "done", says: expect.stringMatching(/Ama/u) });
  });
  it("flow:start/a-doing-nobody-knows-or-with-a-field-missing-is-refused-in-words", async () => {
    const ama = await workspace();
    expect(await ama.act("no.such", {})).toMatchObject({ _tag: "Refused", why: expect.any(String) });
    expect(await ama.act("template.save", { name: "x" })).toMatchObject({ _tag: expect.stringMatching(/Refused|Problems/u) });
  });
});

describe("a manager from a template", () => {
  it("flow:start/our-templates-are-there-and-say-what-they-need", async () => {
    const ama = await workspace();
    const { templates } = await ama.see("/templates");
    expect(templates.map(({ id }) => id).sort()).toEqual(["calls", "customers", "docs", "releases", "repo"]);
    expect(templates.find(({ id }) => id === "repo")).toMatchObject({ whose: "ours", needs: ["github"], managers: [] });
  });
  it("flow:start/connecting-github-shows-its-repos", async () => {
    const f = await flow();
    const repo = await f.repo();
    const { accounts } = await f.ama.see("/settings/connectors");
    expect(accounts[0]).toMatchObject({ connector: "github", works: true, places: [repo.name] });
    const fill = await f.ama.see("/templates/:template", { template: "repo" });
    expect(fill.blanks.find(({ id }) => id === "repo")?.picks.map(({ id }) => id)).toEqual([repo.name]);
  });
  it("flow:start/one-is-made-and-keeps-its-own-copy", async () => {
    const f = await flow();
    const { manager } = await ready(f);
    expect((await f.ama.see("/shell")).tree).toMatchObject([{ id: manager, name: "Coding", above: null }]);
    const view = await f.ama.see("/m/:manager/playbook?version", { manager });
    expect(view).toMatchObject({ draft: false, version: 1, problems: [] });
    expect(JSON.stringify(view.files)).not.toContain("{{");
  });
  it("flow:start/a-blank-place-is-said-and-nothing-is-made", async () => {
    const f = await flow();
    expect(await f.ama.act("manager.make", { template: "repo", answers: {} })).toMatchObject({ _tag: expect.stringMatching(/Refused|Problems/u) });
    expect((await f.ama.see("/shell")).tree).toEqual([]);
  });
  it("flow:start/what-comes-in-is-in-intake", async () => {
    const f = await flow();
    const { repo, manager } = await ready(f);
    await repo.does("issue", { by: "someone-else", title: "Hello", body: "A wish", labels: [] });
    const { rows } = await until(repo, () => f.ama.see("/m/:manager/intake?from&state&before", { manager }), ({ rows }) => rows.length === 1, "one row in intake");
    expect(rows[0]?.item).toMatchObject({ title: "Hello", place: repo.name, by: "event" });
  });
});
