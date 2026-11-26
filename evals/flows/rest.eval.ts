import { describe, expect, it } from "vitest";
import { exports } from "cloudflare:workers";
import type { Changed } from "~/modules/api/types.ts";
import { DAY, flow, pass, until, type Person } from "./kit.ts";
import { asks, opened, ready, waiting } from "./ready.ts";
import { builds, opensIt, saysDone } from "./scripts.ts";

const worker = (exports as unknown as { default: { fetch(request: Request): Promise<Response> } }).default;

describe("MCP servers", () => {
  const add = (person: Person) => person.write("/settings/mcp-servers", { name: "Pages", url: "https://mcp.flows.test/", secret: "mcp-token-that-works" });
  it("flow:mcp/read-only-tools-start-on-and-the-others-ask", async () => {
    const f = await flow();
    const answer = await add(f.ama);
    if (!("server" in answer)) throw new Error(answer.why);
    expect(Object.fromEntries(answer.server.tools.map(({ name, is }) => [name, is]))).toEqual({ find_page: "on", write_page: "ask" });
    expect(answer.server.state._tag).toBe("Works");
    expect(JSON.stringify(await f.ama.see("/settings/mcp-servers"))).not.toContain("mcp-token-that-works");
  });
  it("flow:mcp/a-wrong-secret-a-private-address-and-ours-are-refused-in-words", async () => {
    const f = await flow();
    const wrong = await f.ama.write("/settings/mcp-servers", { name: "Pages", url: "https://mcp.flows.test/", secret: "nope" });
    expect(wrong).toMatchObject("server" in wrong ? { server: { state: { _tag: "Failed" } } } : { _tag: "Refused" });
    for (const url of ["http://mcp.flows.test/", "https://127.0.0.1/", "https://10.0.0.8/", "https://169.254.169.254/", "https://[::1]/", "https://metadata.internal/"])
      expect(await f.ama.write("/settings/mcp-servers", { name: "X", url })).toMatchObject({ _tag: "Refused", why: expect.any(String) });
  });
  it("flow:mcp/a-tool-on-ask-parks-and-runs-after-a-yes", async () => {
    const f = await flow();
    const { repo, manager } = await ready(f);
    const added = await add(f.ama);
    if (!("server" in added)) throw new Error(added.why);
    // A server is an account of its own id, its place is `*`, and its tools are the actions `mcp_<id>_<tool>` (mcp README).
    const [find, write] = ["find_page", "write_page"].map((tool) => `mcp_${added.server.id}_${tool}`) as [string, string];
    const { files, version } = await f.ama.see("/m/:manager/playbook?version", { manager });
    const account = `  - { account: ${added.server.id}, place: "*", may: { ${find}: "on", ${write}: ask } }\n`;
    const reach = (files["reach.yaml"] ?? "").replace("grants:\n", `grants:\n${account}`);
    const workflow = (files["workflow.yaml"] ?? "").replace(/may: &may\n/u, `may: &may\n${account.replace("  - ", "      - ")}`);
    await f.ama.done("version.save", { manager, version, files: { ...files, "reach.yaml": reach, "workflow.yaml": workflow } });
    await f.script(f.models.doer, [
      ...saysDone,
      { tool: write, sees: "Make the change in the clone", start: true, do: { call: write, args: { title: "How we add" } } },
      ...builds().map((rule) => ("start" in rule ? { ...rule, start: undefined, after: write } : rule)) as never,
      ...opensIt(),
    ]);
    await asks(f, repo);
    const [ask] = await until(repo, () => waiting(f.ama), (all) => all.length === 1, "the write is asked");
    expect(JSON.stringify(ask)).toContain("How we add");
    const calls = async () => (await f.seen(f.models.doer)).length;
    const before = await calls();
    await f.ama.write("/inbox/:ask", { answer: ask?.best ?? ask?.options[0]?.id ?? "" }, { ask: ask?.id ?? "" });
    await until(repo, calls, (now) => now > before, "it went on");
  });
});

describe("search", () => {
  it("flow:search/finds-work-managers-and-chats-by-their-words", async () => {
    const f = await flow();
    const { manager, work } = await opened(f);
    const found = async (words: string) => (await f.ama.see("/search?words", { words })).found;
    expect(await found("subtracts")).toEqual(expect.arrayContaining([expect.objectContaining({ is: "work", id: work })]));
    expect(await found("Coding")).toEqual(expect.arrayContaining([expect.objectContaining({ is: "manager", id: manager })]));
    expect(await found("smallest change")).toEqual(expect.arrayContaining([expect.objectContaining({ is: "playbook" })]));
    expect(await found("nothing says this")).toEqual([]);
  });
  it("flow:search/never-what-you-may-not-see", async () => {
    const f = await flow();
    await f.ama.write("/chats", { text: "The pelican budget", key: "k" });
    const mine = (await f.ama.see("/search?words", { words: "pelican" })).found;
    expect(mine).toEqual(expect.arrayContaining([expect.objectContaining({ is: "chat" })]));
    const chidi = await f.joins("Chidi", "Member");
    expect((await chidi.see("/search?words", { words: "pelican" })).found).toEqual([]);
    const other = await flow();
    expect((await other.ama.see("/search?words", { words: "pelican" })).found).toEqual([]);
  });
});

describe("the live socket", () => {
  const open = (person: Person) =>
    worker.fetch(new Request(`http://app.test/api/ws/${person.workspace}/live`, { headers: { upgrade: "websocket", cookie: person.browser.cookie, origin: "http://app.test" } }));
  it("flow:live/says-which-reads-changed", async () => {
    const f = await flow();
    const { manager } = await ready(f);
    const { webSocket } = await open(f.ama);
    if (webSocket === null) throw new Error("no socket");
    webSocket.accept();
    const heard: string[] = [];
    webSocket.addEventListener("message", ({ data }) => heard.push(...(JSON.parse(String(data)) as Changed).reads));
    await f.ama.done("manager.pause", { manager });
    await until(null, async () => heard, (reads) => reads.includes("/shell") && reads.some((read) => read.startsWith(`/m/${manager}`)), "the shell and the manager changed");
    webSocket.close();
  });
  it("flow:live/is-not-for-someone-else", async () => {
    const f = await flow();
    const other = await flow();
    const answer = await worker.fetch(
      new Request(`http://app.test/api/ws/${f.ama.workspace}/live`, { headers: { upgrade: "websocket", cookie: other.ama.browser.cookie, origin: "http://app.test" } }),
    );
    expect([401, 403, 404]).toContain(answer.status);
    expect(answer.webSocket).toBeNull();
  });
});

describe("who may", () => {
  it("flow:safe/nothing-of-a-workspace-is-read-from-another", async () => {
    const f = await flow();
    const { manager, work } = await opened(f);
    const other = await flow();
    const stranger = async (path: string) => (await other.ama.browser.send("GET", `/api/ws/${f.ama.workspace}${path}`)).status;
    for (const path of ["/shell", "/inbox", "/tree", "/settings/keys", `/m/${manager}`, `/m/${manager}/work/${work}`]) expect([401, 403, 404]).toContain(await stranger(path));
    expect((await other.ama.ask("/m/:manager", { manager })).status).toBe(404);
  });
  it("flow:safe/a-member-sees-and-uses-a-builder-changes-managers-an-owner-the-rest", async () => {
    const f = await flow();
    const { manager } = await ready(f);
    const chidi = await f.joins("Chidi", "Member");
    const bo = await f.joins("Bo", "Builder");
    expect((await chidi.see("/m/:manager", { manager })).head).toBeDefined();
    expect(await chidi.act("manager.pause", { manager })).toMatchObject({ _tag: "Refused" });
    expect(await bo.act("manager.pause", { manager })).toMatchObject({ _tag: "Done" });
    expect(await bo.act("models.default", { connection: f.connection, model: f.models.juno, thinking: "low" })).toMatchObject({ _tag: "Refused" });
    expect(await bo.act("workspace.delete", { name: "x" })).toMatchObject({ _tag: "Refused" });
  });
  it("flow:safe/the-same-press-twice-is-once", async () => {
    const f = await flow();
    const { manager } = await ready(f);
    const values = { manager, kind: "bug", title: "Twice", about: "x" };
    const [a, b] = await Promise.all([f.ama.done("work.add", values, "same"), f.ama.done("work.add", values, "same")]);
    expect(a).toBe(b);
    expect((await f.ama.see("/m/:manager/board", { manager })).cards.filter(({ work }) => work.title === "Twice")).toHaveLength(1);
  });
  it("flow:safe/everything-done-is-one-line-in-the-log", async () => {
    const f = await flow();
    const { manager } = await ready(f);
    const chidi = await f.joins("Chidi", "Member");
    await f.ama.done("manager.pause", { manager });
    await chidi.act("manager.start", { manager });
    const { lines } = await f.ama.see("/settings/audit-log?by&outcome&before");
    expect(lines.slice(0, 2)).toMatchObject([
      { by: "Chidi", coworker: false, outcome: "refused" },
      { by: "Ama", coworker: false, outcome: "done", permission: "on" },
    ]);
  });
  it("flow:safe/who-leaves-loses-everything-at-once", async () => {
    const f = await flow();
    const { manager } = await ready(f);
    const bo = await f.joins("Bo", "Builder");
    const { people } = await f.ama.see("/settings/members");
    await f.ama.done("person.remove", { person: people.find(({ name }) => name === "Bo")?.id ?? "" });
    expect([401, 403, 404]).toContain((await bo.ask("/m/:manager", { manager })).status);
    expect((await f.ama.see("/settings/members")).people.map(({ name }) => name)).toEqual(["Ama"]);
  });
});

describe("the workspace", () => {
  it("flow:workspace/is-exported-whole-and-without-a-secret", async () => {
    const f = await flow();
    await opened(f);
    const did = await f.ama.act("workspace.export", {});
    if (did._tag !== "Done" || did.link === null) throw new Error(JSON.stringify(did));
    const file = await f.ama.browser.send("GET", did.link);
    expect(file.status).toBe(200);
    const text = await file.text();
    expect(text).toContain("add.sh subtracts");
    expect(text).toContain("SKILL.md");
    expect(text).not.toMatch(/flows-key-that-works|ghs_|PRIVATE KEY/u);
  });
  it("flow:workspace/is-deleted-for-good-thirty-days-after-its-name-was-typed", async () => {
    const f = await flow();
    const { name } = await f.ama.see("/settings/general");
    expect((await f.ama.act("workspace.delete", { name: "not it" }))._tag).not.toBe("Done");
    const did = await f.ama.act("workspace.delete", { name });
    expect(did).toMatchObject({ _tag: "Done", says: expect.stringMatching(/\d/u) });
    await pass(f.ama, 29 * DAY);
    expect((await f.ama.ask("/shell")).status).toBe(200);
    await pass(f.ama, 2 * DAY);
    expect([401, 403, 404]).toContain((await f.ama.ask("/shell")).status);
  });
});
