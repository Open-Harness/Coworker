import { describe, expect, it } from "vitest";
import { gitHubWorld } from "~/modules/github/testing.ts";
import { sandboxWorld } from "~/modules/sandboxes/testing.ts";
import type { SaveResult } from "~/modules/sandboxes/types.ts";
import { eventually, json } from "../../test/flows.ts";
import { allowGitHub, AMA, deliver, hears, installed, on } from "../../test/github.ts";
import { audit, board, chatLog, runOf, say, team, type Team } from "../../test/team.ts";

/*
 * Support tests for the GitHub token a run's command gets as GH_TOKEN (not book evals): one repo, made fresh for the
 * command, read-only for a fork, only through the workspace's own installation, and never written anywhere.
 */

sandboxWorld.script("echo $GH_TOKEN", (env) => ({ stdout: env["GH_TOKEN"] ?? "no token" }));

/** A team whose agent Worker has an environment, whose manager hears `repos` of an installation, and lets Ama ask. */
async function ready(name: string, installation: number, repos: readonly string[], hear = repos) {
  const launch = await team(name);
  const saved = await json<SaveResult>(await launch.owner.send("PUT", `${launch.workspace}/environments`, { name: "app", setup: "" }));
  if (saved._tag !== "Saved") throw new Error(saved._tag);
  await launch.owner.send("PUT", `${launch.workspace}/agents/Worker/environment`, { environment: saved.environment.id });
  await installed(launch, installation, repos);
  await hears(
    launch,
    hear.map((repo) => ({ repo, events: ["issues", "pull_request"] })),
  );
  await allowGitHub(launch, AMA.id);
  return launch;
}

const issue = (installation: number, repo: string, number: number) =>
  on(installation, repo, AMA, "issues", "opened", { issue: { number, title: "Export docs", body: "@launch please" } });

const forkPull = (installation: number, repo: string, number: number) =>
  on(installation, repo, AMA, "pull_request", "opened", {
    number,
    pull_request: {
      number,
      title: "Docs from a fork",
      body: "@launch please",
      head: { ref: "docs", repo: { full_name: "ama-gh/web", fork: true } },
      base: { repo: { full_name: repo } },
    },
  });

async function task(launch: Team, count: number): Promise<void> {
  await eventually(
    () => board(launch),
    ({ tasks }) => tasks.length === count,
  );
}

/** A run on DT-n that runs `echo $GH_TOKEN`, waited for. */
async function runEcho(launch: Team, n: number) {
  await say(launch, `start a tester on DT-${n} run: echo $GH_TOKEN`, `run-${n}`);
  return eventually(
    () => runOf(launch, `run-${n}`),
    ({ run }) => run?.state === "ended",
    20_000,
  );
}

const lastRun = () => sandboxWorld.ran.at(-1);

describe("the token a command gets", () => {
  it("is for the repo of the Task's GitHub thread, with write for the base repo, and is hidden wherever it could show", async () => {
    const launch = await ready("tokthread", 8101, ["acme/tokthread"]);
    await deliver("issues", issue(8101, "acme/tokthread", 1));
    await task(launch, 1);
    const ended = await runEcho(launch, 1);
    const granted = gitHubWorld.tokens.filter(({ repo }) => repo === "acme/tokthread").at(-1);
    expect(granted).toMatchObject({ installation: 8101, repo: "acme/tokthread", permissions: { contents: "write" } });
    const token = lastRun()?.env["GH_TOKEN"] ?? "";
    expect(token).toMatch(/^ghs_fake/u);
    // What the run saw is the name, and the token is in no place a person or a log can read.
    expect(ended.run.note).toContain("[secret GH_TOKEN]");
    const everything = JSON.stringify([
      ended,
      await chatLog(launch),
      await json(await launch.owner.send("GET", `${launch.base}/events`)),
      await audit(launch),
      await board(launch),
      sandboxWorld.prepared,
      await json(await launch.owner.send("GET", `${launch.workspace}/environments`)),
    ]);
    expect(everything).not.toContain(token);
    for (const prepared of sandboxWorld.prepared) expect(prepared.env["GH_TOKEN"]).toBeUndefined();
  }, 60_000);

  it("is made fresh for each command", async () => {
    const launch = await ready("tokfresh", 8102, ["acme/tokfresh"]);
    await deliver("issues", issue(8102, "acme/tokfresh", 1));
    await task(launch, 1);
    await runEcho(launch, 1);
    const first = lastRun()?.env["GH_TOKEN"];
    await say(launch, "start a tester on DT-1 run: echo $GH_TOKEN", "run-again");
    await eventually(
      () => runOf(launch, "run-again"),
      ({ run }) => run?.state === "ended",
      20_000,
    );
    expect(lastRun()?.env["GH_TOKEN"]).toMatch(/^ghs_fake/u);
    expect(lastRun()?.env["GH_TOKEN"]).not.toBe(first);
  }, 60_000);

  it("is read-only for a pull request from a fork", async () => {
    const launch = await ready("tokfork", 8103, ["acme/tokfork"]);
    await deliver("pull_request", forkPull(8103, "acme/tokfork", 3));
    await task(launch, 1);
    await runEcho(launch, 1);
    const granted = gitHubWorld.tokens.filter(({ repo }) => repo === "acme/tokfork").at(-1);
    expect(granted?.permissions).toMatchObject({ contents: "read", pull_requests: "read", issues: "read" });
    expect(Object.values(granted?.permissions ?? {})).not.toContain("write");
  }, 60_000);

  it("is, for a Task with no GitHub thread, a read token for the one repo its manager hears", async () => {
    const launch = await ready("toksolo", 8104, ["acme/toksolo", "acme/other"], ["acme/toksolo"]);
    await say(launch, "add a task: Tidy up", "task-a");
    await task(launch, 1);
    await runEcho(launch, 1);
    const granted = gitHubWorld.tokens.filter(({ installation }) => installation === 8104).at(-1);
    expect(granted).toEqual({ installation: 8104, repo: "acme/toksolo", permissions: { contents: "read", metadata: "read" } });
  }, 60_000);

  it("is none when the manager hears two repos, or none, and the command still runs", async () => {
    const launch = await ready("tokmany", 8105, ["acme/tokmany", "acme/tokmore"]);
    await say(launch, "add a task: Tidy up", "task-a");
    await task(launch, 1);
    const before = gitHubWorld.tokens.length;
    const ended = await runEcho(launch, 1);
    expect(gitHubWorld.tokens).toHaveLength(before);
    expect(lastRun()?.env["GH_TOKEN"]).toBeUndefined();
    expect(ended.run.note).toContain("no token");
  }, 60_000);

  it("is none, and the command still runs, when the installation is gone", async () => {
    const launch = await ready("tokgone", 8106, ["acme/tokgone"]);
    await deliver("issues", issue(8106, "acme/tokgone", 1));
    await task(launch, 1);
    gitHubWorld.uninstall(8106);
    const ended = await runEcho(launch, 1);
    expect(ended.run.state).toBe("ended");
    expect(lastRun()?.env["GH_TOKEN"]).toBeUndefined();
    expect(ended.run.note).toContain("no token");
  }, 60_000);

  it("never comes from another workspace's installation, and a workspace with no GitHub gets none", async () => {
    const mine = await ready("tokmine", 8107, ["acme/tokmine"]);
    const theirs = await ready("toktheirs", 8108, ["acme/toktheirs"]);
    const bare = await team("tokbare");
    await deliver("issues", issue(8107, "acme/tokmine", 1));
    await deliver("issues", issue(8108, "acme/toktheirs", 1));
    await task(mine, 1);
    await task(theirs, 1);
    await runEcho(mine, 1);
    await runEcho(theirs, 1);
    for (const [installation, repo] of [
      [8107, "acme/tokmine"],
      [8108, "acme/toktheirs"],
    ] as const) {
      const made = gitHubWorld.tokens.filter((granted) => granted.repo === repo);
      expect(made.length).toBeGreaterThan(0);
      expect(made.every((granted) => granted.installation === installation)).toBe(true);
    }
    // A workspace that connected no installation is given nothing, though others have tokens in the same isolate.
    const bareEnv = await json<SaveResult>(await bare.owner.send("PUT", `${bare.workspace}/environments`, { name: "app", setup: "" }));
    if (bareEnv._tag !== "Saved") throw new Error(bareEnv._tag);
    await bare.owner.send("PUT", `${bare.workspace}/agents/Worker/environment`, { environment: bareEnv.environment.id });
    await say(bare, "add a task: Tidy up", "task-a");
    await task(bare, 1);
    const before = gitHubWorld.tokens.length;
    await runEcho(bare, 1);
    expect(gitHubWorld.tokens).toHaveLength(before);
    expect(lastRun()?.env["GH_TOKEN"]).toBeUndefined();
  }, 90_000);
});
