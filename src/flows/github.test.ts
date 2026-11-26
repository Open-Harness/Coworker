import { describe, expect, it } from "vitest";
import { gitHubWorld } from "~/modules/github/testing.ts";
import { eventually, json } from "../../test/flows.ts";
import { events } from "../../test/email.ts";
import { allowGitHub, AMA, BO, connection, deliver, hears, installed, on } from "../../test/github.ts";
import { board, chatLog, inbox, team } from "../../test/team.ts";

const KANBAN = ["issues", "issue_comment", "pull_request", "pull_request_review", "check_run"];
const lines = async (launch: Awaited<ReturnType<typeof team>>) => (await events(launch)).map(({ line }) => line);
const issue = (installation: number, repo: string, sender: object, number: number, title: string, body: string) =>
  on(installation, repo, sender as Record<string, unknown>, "issues", "opened", { issue: { number, title, body } });
const comment = (installation: number, repo: string, sender: object, number: number, body: string, pr = false) =>
  on(installation, repo, sender as Record<string, unknown>, "issue_comment", "created", {
    issue: { number, title: "Export docs", ...(pr ? { pull_request: { url: "x" } } : {}) },
    comment: { body },
  });

/** A team whose manager hears `acme/<repo>` with the template's events, and lets Ama ask. */
async function heard(name: string, installation: number, events?: readonly string[]) {
  const launch = await team(name);
  const repo = `acme/${name}`;
  await installed(launch, installation, [repo]);
  await hears(launch, [{ repo, ...(events === undefined ? {} : { events }) }]);
  await allowGitHub(launch, AMA.id);
  return { launch, repo };
}

const oneTask = async (launch: Awaited<ReturnType<typeof team>>) =>
  eventually(
    async () => (await board(launch)).tasks,
    (tasks) => tasks.length === 1,
  );

describe("github", () => {
  it("flw:github/install", async () => {
    const launch = await team("ghinstall");
    const connected = await installed(launch, 7101, ["acme/api", "acme/web"]);
    expect(connected.status).toBe(200);
    expect((await connection(launch)).installation).toEqual({ id: 7101, account: "acme", repos: ["acme/api", "acme/web"] });
    expect((await hears(launch, [{ repo: "acme/api" }, { repo: "acme/web", events: ["issues", "nonsense"] }])).status).toBe(200);
    const { sources } = await connection(launch);
    expect(sources.find(({ repo }) => repo === "acme/api")?.events).toEqual(KANBAN);
    expect(sources.find(({ repo }) => repo === "acme/web")?.events).toEqual(["issues"]);
    expect((await hears(launch, [{ repo: "other/repo" }])).status).toBe(400);
    // An installation belongs to one workspace.
    const other = await team("ghinstall2");
    expect((await installed(other, 7101, ["acme/api", "acme/web"])).status).toBe(409);
  });

  it("flw:github/signature", async () => {
    const { launch, repo } = await heard("ghsig", 7102);
    const payload = issue(7102, repo, AMA, 1, "Export docs", "@launch please");
    expect((await deliver("issues", payload, { secret: "not-the-secret" })).status).toBe(401);
    expect((await deliver("issues", payload, { secret: null })).status).toBe(401);
    expect(await lines(launch)).toEqual([]);
    expect((await board(launch)).tasks).toEqual([]);
  });

  it("flw:github/dedupe", async () => {
    const { launch, repo } = await heard("ghdedupe", 7103);
    const payload = issue(7103, repo, AMA, 1, "Export docs", "@launch please");
    expect((await deliver("issues", payload, { id: "same-delivery" })).status).toBe(202);
    const again = await json<{ routed: { _tag: string }[] }>(await deliver("issues", payload, { id: "same-delivery" }));
    expect(again.routed).toEqual([{ _tag: "Duplicate" }]);
    await oneTask(launch);
    expect((await lines(launch)).filter((line) => line.includes("candidate"))).toHaveLength(1);
  });

  it("flw:github/issue-allowed", async () => {
    const { launch, repo } = await heard("ghallowed", 7104);
    await deliver("issues", issue(7104, repo, AMA, 12, "Export docs for v2.3", "@launch can the docs say the row limit?"));
    expect((await oneTask(launch))[0]?.title).toBe("Export docs for v2.3");
    expect(await lines(launch)).toContain("github from ama-gh: “Export docs for v2.3” → explicit candidate");
    expect((await chatLog(launch)).some(({ text }) => text.startsWith("Candidate (explicit), github from ama-gh."))).toBe(true);
    const replies = await eventually(
      async () => gitHubWorld.commentsOn(repo, 12),
      (found) => found.length > 0,
    );
    expect(replies[0]).toMatch(/^Got it\. This is DT-1/u);
  });

  it("flw:github/issue-unknown", async () => {
    const { launch, repo } = await heard("ghunknown", 7105);
    await deliver("issues", issue(7105, repo, BO, 1, "Export docs", "@launch please"));
    expect(await lines(launch)).toContain("github from bo-gh: “Export docs” → ignored: The sender is not on the allowed list");
    expect((await board(launch)).tasks).toEqual([]);
    // The admission table decides for strangers, per receiving scope.
    await launch.owner.send("PUT", `${launch.base}/policy`, {
      acceptMode: "observe",
      allowed: [],
      admission: { [`repo:${repo}:issues`]: "inferred" },
    });
    await deliver("issues", issue(7105, repo, BO, 2, "Second ask", "@launch please"));
    expect(await lines(launch)).toContain("github from bo-gh: “Second ask” → inferred candidate");
  });

  it("flw:github/not-chosen", async () => {
    const { launch, repo } = await heard("ghnotchosen", 7106, ["issues"]);
    const answered = await json<{ routed: { _tag: string }[] }>(
      await deliver("issue_comment", comment(7106, repo, AMA, 3, "@launch hello")),
    );
    expect(answered.routed).toEqual([{ _tag: "Dropped", reason: `issue_comment is not chosen for ${repo}` }]);
    expect(await lines(launch)).toEqual([`github from ama-gh: “Export docs” → ignored: issue_comment is not chosen for ${repo}`]);
    expect((await chatLog(launch)).some(({ text }) => text.includes("github from"))).toBe(false);
  });

  it("flw:github/own-comment", async () => {
    const { launch, repo } = await heard("ghown", 7107);
    await deliver("issues", issue(7107, repo, AMA, 1, "Export docs", "@launch please"));
    await oneTask(launch);
    const bot = { id: 9001, login: "co-worker[bot]", type: "Bot" };
    await deliver("issue_comment", comment(7107, repo, bot, 1, "Got it. This is DT-1: Export docs."));
    expect(await lines(launch)).toContain("github from co-worker[bot]: “Export docs” → ignored: our own comment");
    expect((await chatLog(launch)).some(({ text }) => text.startsWith("Follow-up on DT-1"))).toBe(false);
  });

  it("flw:github/pr-follows", async () => {
    const { launch, repo } = await heard("ghprfollow", 7108);
    await deliver("issues", issue(7108, repo, AMA, 1, "Export docs", "@launch please"));
    await oneTask(launch);
    // Someone not on the list opens the pull request that fixes the Task's issue, then comments on it.
    const opened = on(7108, repo, BO, "pull_request", "opened", {
      number: 2,
      pull_request: { number: 2, title: "Docs for export", body: "Fixes #1", head: { ref: "docs" } },
    });
    await deliver("pull_request", opened);
    await deliver("issue_comment", comment(7108, repo, BO, 2, "Ready for review", true));
    const log = await eventually(
      chatLog.bind(undefined, launch),
      (found) => found.filter(({ text }) => text.startsWith("Follow-up on DT-1")).length === 2,
    );
    expect(log.filter(({ text }) => text.startsWith("Follow-up on DT-1, github from bo-gh."))).toHaveLength(2);
    expect((await lines(launch)).filter((line) => line.endsWith("→ follow-up on DT-1"))).toHaveLength(2);
    expect((await board(launch)).tasks).toHaveLength(1);
  });

  it("flw:github/check-failed", async () => {
    const { launch, repo } = await heard("ghcheck", 7109);
    await deliver("issues", issue(7109, repo, AMA, 1, "Export docs", "@launch please"));
    await oneTask(launch);
    await deliver(
      "pull_request",
      on(7109, repo, AMA, "pull_request", "opened", { pull_request: { number: 2, title: "DT-1: docs", body: "" } }),
    );
    const failed = on(7109, repo, { id: 41898282, login: "github-actions[bot]", type: "Bot" }, "check_run", "completed", {
      check_run: {
        name: "test",
        conclusion: "failure",
        pull_requests: [{ number: 2 }],
        output: { title: "2 tests failed", summary: "export.test.ts" },
      },
    });
    await deliver("check_run", failed);
    const log = await eventually(chatLog.bind(undefined, launch), (found) => found.some(({ text }) => text.includes("Check failed: test")));
    const seen = log.find(({ text }) => text.includes("Check failed: test"))?.text ?? "";
    expect(seen).toMatch(/^Follow-up on DT-1, github from github-actions\[bot\]\./u);
    expect(seen).toContain("2 tests failed");
  });

  it("flw:github/uninstall", async () => {
    const { launch, repo } = await heard("ghuninstall", 7110);
    const removed = on(7110, repo, AMA, "installation", "deleted", { installation: { id: 7110, account: { login: "acme" } } });
    delete removed["repository"];
    expect((await deliver("installation", removed)).status).toBe(202);
    expect(await connection(launch)).toEqual({ sources: [] });
    const notices = (await inbox(launch.owner, launch)).filter(({ kind }) => kind === "notice");
    expect(notices.map(({ title }) => title)).toEqual([expect.stringMatching(/^The GitHub App was uninstalled from acme\./u)]);
    // The sources are gone: an issue now reaches nobody.
    await deliver("issues", issue(7110, repo, AMA, 1, "Export docs", "@launch please"));
    expect(await lines(launch)).toEqual([]);
  });

  it("tells a manager's screens the App was lost, and what it heard, until it is installed again", async () => {
    const { launch, repo } = await heard("ghlost", 7111);
    const mine = async () =>
      (await json<{ github: { lost?: { account: string; sources: object[] } } }>(await launch.owner.send("GET", `${launch.base}/github`)))
        .github;
    expect((await mine()).lost).toBeUndefined();
    const removed = on(7111, repo, AMA, "installation", "deleted", { installation: { id: 7111, account: { login: "acme" } } });
    delete removed["repository"];
    await deliver("installation", removed);
    const lost = (await mine()).lost;
    expect(lost?.account).toBe("acme");
    expect(lost?.sources).toEqual([expect.objectContaining({ repo })]);
    await installed(launch, 7112, [repo]);
    expect((await mine()).lost).toBeUndefined();
  });
});
