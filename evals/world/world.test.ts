import { createSign } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appApi } from "~/modules/github/service.ts";
import { httpBoxes, httpGit } from "~/modules/boxes/testing.ts";
import { git, root } from "./git.ts";
import { APP_ID, APP_KEY, outside } from "./outside.ts";

const send = ((input: RequestInfo | URL, init?: RequestInit) => outside(new Request(input as string, init))) as typeof fetch;
const post = async (path: string, body: object): Promise<Record<string, any>> =>
  (await (await send(`https://world.test${path}`, { method: "POST", body: JSON.stringify(body) })).json()) as Record<string, any>;
const does = (repo: string, what: string, more: object = {}) => post("/do", { repo, does: what, by: "ama", ...more });

const jwt = (): string => {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const head = `${part({ alg: "RS256" })}.${part({ iss: APP_ID })}`;
  return `${head}.${createSign("RSA-SHA256").update(head).sign(APP_KEY, "base64url")}`;
};
async function tokenFor(installation: number, permissions: object, repositories: readonly string[]): Promise<string> {
  const answer = await send(`https://api.github.com/app/installations/${installation}/access_tokens`, {
    method: "POST",
    headers: { authorization: `Bearer ${jwt()}` },
    body: JSON.stringify({ permissions, repositories }),
  });
  return ((await answer.json()) as { token: string }).token;
}
const as = (token: string, method: string, path: string, body?: object) =>
  send(`https://api.github.com${path}`, { method, headers: { authorization: `token ${token}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

let made = 0;
async function repo(more: object = {}): Promise<{ name: string; installation: number }> {
  made += 1;
  const name = `world${made}/app`;
  const { installation } = await post("/repo", { repo: name, owner: "ama", writers: ["bo"], files: { "a.txt": "one\n" }, ...more });
  return { name, installation };
}

describe("GitHub", () => {
  it("gives the real adapter its installation, a claim and a comment", async () => {
    const { name, installation } = await repo();
    const { code } = await post("/sign-in", { login: "ama", installations: [installation] });
    const api = appApi({ appId: APP_ID, privateKey: APP_KEY, slug: "juno-test", client: { clientId: "c", clientSecret: "s" }, fetch: send, now: Date.now });
    expect(await api.installation(installation)).toMatchObject({ id: installation, repos: [name] });
    expect(await api.claim(installation, code)).toMatchObject({ _tag: "Claimed" });
    await does(name, "issue", { title: "Broken", body: "It is", labels: ["juno"] });
    expect(await api.comment(installation, name, 1, "Looking")).toEqual({ _tag: "Sent" });
    const { issues } = await does(name, "look");
    expect(issues[0].comments).toEqual([{ id: expect.any(Number), by: "juno-test[bot]", body: "Looking" }]);
    const { deliveries } = await does(name, "deliveries");
    expect(deliveries.map(({ event, payload }: any) => `${event}.${payload.action}`)).toEqual(["issues.opened", "issues.labeled", "issue_comment.created"]);
    expect((await does(name, "deliveries")).deliveries).toEqual([]);
  });

  it("refuses what a token has no right to, what the App was not given, and other repos", async () => {
    const { name, installation } = await repo({ permissions: { checks: "read" } });
    await does(name, "issue", { title: "One" });
    const reads = await tokenFor(installation, { issues: "read" }, ["app"]);
    expect((await as(reads, "POST", `/repos/${name}/issues/1/comments`, { body: "x" })).status).toBe(403);
    expect((await as(reads, "GET", "/repos/world-other/app/issues/1")).status).toBe(404);
    expect(await tokenFor(installation, { checks: "write" }, ["app"])).toBeUndefined();
    await does(name, "uninstall");
    expect((await as(reads, "GET", `/repos/${name}/issues/1`)).status).toBe(404);
  });

  it("opens, reviews, checks and merges a pull request as GitHub does, and closes what it closes", async () => {
    const { name, installation } = await repo({ guarded: true });
    await does(name, "issue", { title: "Broken" });
    const { number } = await does(name, "pull", { branch: "fix", title: "Fix it", body: "Closes #1", files: { "a.txt": "two\n" } });
    const token = await tokenFor(installation, { contents: "write", pull_requests: "write" }, ["app"]);
    expect((await as(token, "PUT", `/repos/${name}/pulls/${number}/merge`, {})).status).toBe(405);
    await does(name, "check", { number, name: "test", conclusion: "success" });
    await does(name, "line", { number, path: "a.txt", line: 1, text: "Why?" });
    await does(name, "review", { number, state: "APPROVED", text: "Fine" });
    expect((await as(token, "PUT", `/repos/${name}/pulls/${number}/merge`, {})).status).toBe(200);
    const { issues } = await does(name, "look");
    expect(issues.map(({ state }: any) => state)).toEqual(["closed", "closed"]);
    expect((await does(name, "file", { path: "a.txt" })).text).toBe("two");
    const { deliveries } = await does(name, "deliveries");
    expect(deliveries.map(({ event }: any) => event)).toEqual([
      "issues", "pull_request", "check_run", "check_suite", "pull_request_review_comment", "pull_request_review", "pull_request", "push", "issues",
    ]);
  });

  it("says when two changes cannot be merged", async () => {
    const { name } = await repo();
    const { number } = await does(name, "pull", { branch: "fix", title: "Fix", body: "", files: { "a.txt": "two\n" } });
    await does(name, "push", { branch: "main", files: { "a.txt": "three\n" } });
    expect(await does(name, "merge", { number })).toEqual({ why: "Pull Request is not mergeable" });
  });
});

describe("boxes", () => {
  it("clone, run, keep files over a save, and leave only by a bundle", async () => {
    const { name, installation } = await repo();
    const read = await tokenFor(installation, { contents: "read" }, ["app"]);
    const host = httpBoxes(send);
    const spec = { work: "W-1", size: "1 vCPU · 2 GB" as const, setUp: "echo ready > .ready", clone: { url: `https://github.com/${name}.git`, token: read, branch: "juno/1" }, env: {}, hosts: [] };
    const opened = await host.start(spec, null);
    if (opened._tag !== "Open") throw new Error(opened.why);
    expect(await opened.box.read("a.txt")).toBe("one\n");
    await opened.box.write("a.txt", "fixed\n");
    expect(await opened.box.exec("cat a.txt; exit 3", { seconds: 5 })).toMatchObject({ exitCode: 3, stdout: "fixed\n" });
    const saved = await host.save("W-1");
    await host.destroy("W-1");
    expect(await host.find("W-1")).toBeUndefined();
    const again = await host.start(spec, saved ?? null);
    if (again._tag !== "Open") throw new Error(again.why);
    expect(await again.box.read("a.txt")).toBe("fixed\n");
    await again.box.exec("git add a.txt && git commit -qm Fix && git bundle create ../w1.bundle juno/1 ^origin/main", { seconds: 10 });
    const bytes = await again.box.exec("base64 < ../w1.bundle", { seconds: 5 });
    const bundle = { repo: name, branch: "juno/1", base: "", head: "", files: ["a.txt"], bytes: Uint8Array.from(Buffer.from(bytes.stdout, "base64")) };
    expect(await httpGit(send).push(bundle, read, { force: "no" })).toMatchObject({ _tag: "Refused" });
    const write = await tokenFor(installation, { contents: "write" }, ["app"]);
    expect(await httpGit(send).push(bundle, write, { force: "no" })).toMatchObject({ _tag: "Pushed" });
    expect((await does(name, "file", { branch: "juno/1", path: "a.txt" })).text).toBe("fixed");
    expect((await does(name, "look")).boxes[0]).toMatchObject({ token: { contents: "read" } });
  });

  it("refuse workflow files without the right, and stop what runs too long", async () => {
    const { name, installation } = await repo();
    const folder = await mkdtemp(join(root, "try-"));
    const write = await tokenFor(installation, { contents: "write" }, ["app"]);
    await git(folder, "init", "--quiet", "--initial-branch=bad");
    await git(folder, "fetch", "--quiet", join(root, "repos", `${name}.git`), "main");
    await git(folder, "reset", "--quiet", "--hard", "FETCH_HEAD");
    await git(folder, "config", "core.excludesFile", "/dev/null");
    const { mkdir } = await import("node:fs/promises");
    await mkdir(join(folder, ".github/workflows"), { recursive: true });
    await writeFile(join(folder, ".github/workflows/x.yml"), "on: push\n");
    await git(folder, "add", "--all");
    await git(folder, "commit", "--quiet", "-m", "Bad");
    await git(folder, "bundle", "create", "b.bundle", "bad", "^FETCH_HEAD");
    const { readFile } = await import("node:fs/promises");
    const bytes = new Uint8Array(await readFile(join(folder, "b.bundle")));
    const pushed = await httpGit(send).push({ repo: name, branch: "bad", base: "", head: "", files: [], bytes }, write, { force: "no" });
    expect(pushed).toMatchObject({ _tag: "Refused", why: expect.stringContaining("workflow") });
    const opened = await httpBoxes(send).start({ work: "W-2", size: "1 vCPU · 2 GB", setUp: "", clone: null, env: {}, hosts: [] }, null);
    if (opened._tag !== "Open") throw new Error(opened.why);
    expect((await opened.box.exec("sleep 20", { seconds: 1 })).exitCode).not.toBe(0);
  });
});

describe("models", () => {
  const ask = (body: object, key = "flows-key-that-works") =>
    send("https://models.flows.test/v1/chat/completions", { method: "POST", headers: { authorization: `Bearer ${key}` }, body: JSON.stringify({ model: "m", stream: true, ...body }) });
  it("do what was written down, once each, with what they read, and are kept", async () => {
    await post("/script", { model: "m", rules: [{ sees: "issue #(\\d+)", tool: "note", do: { call: "note", args: { says: "about $1" } } }, { after: "note", do: { say: "Done" } }] });
    const tools = [{ type: "function", function: { name: "note", parameters: {} } }];
    const asked = [{ role: "user", content: "Look at issue #7" }];
    expect(await (await ask({ messages: asked, tools })).text()).toContain("about 7");
    const answered = [...asked, { role: "assistant", tool_calls: [{ id: "c1", function: { name: "note", arguments: "{}" } }] }, { role: "tool", tool_call_id: "c1", content: "ok" }];
    expect(await (await ask({ messages: answered, tools })).text()).toContain("Done");
    expect(await (await ask({ messages: asked, tools })).text()).toContain("nothing to do");
    expect((await ask({ messages: asked }, "wrong")).status).toBe(401);
    expect((await post("/seen", { model: "m" })).seen.map(({ did }: any) => did)).toEqual(['note {"says":"about 7"}', "Done", "I have nothing to do."]);
    await post("/turn", { model: "m", is: "off" });
    expect((await ask({ messages: asked })).status).toBe(503);
  });
});

it("answers nobody else", async () => expect((await send("https://example.com/")).status).toBe(502));
