import { expect } from "vitest";
import { liveApp } from "~/modules/liveapp/service.ts";
import { liveIt, setting, staging, until } from "./support.ts";

const MINUTE = 60_000;

/**
 * One line, because the run's brief carries it after "run:". The token is the process environment of this command
 * (`$GH_TOKEN`), made for the repo the manager hears; it is used for the clone only.
 */
const CLONE_AND_TEST = (repo: string): string =>
  [
    'auth=$(printf "x-access-token:%s" "$GH_TOKEN" | base64 | tr -d "\\n")',
    `git -c "http.extraHeader=Authorization: Basic $auth" clone --depth 1 https://github.com/${repo}.git /workspace/sandbox`,
    "cd /workspace/sandbox",
    "npm test",
  ].join(" && ");

liveIt(
  "live:sandbox/clone-test",
  async () => {
    const { session, live } = await staging({ github: true, sandbox: true });
    const before = new Set((await liveApp.board(session, live)).tasks.map(({ id }) => id));
    // Ask the manager in chat: it makes a task, then starts a run on it that runs the command in a container and reports.
    await liveApp.chat(session, live, `add a task: Run the sandbox tests ${Date.now()}`, `task-${Date.now()}`);
    const task = await until(async () => (await liveApp.board(session, live)).tasks.find(({ id }) => !before.has(id)), MINUTE);
    expect(task, "the manager made no task").toBeDefined();
    const request = `run-live-${Date.now()}`;
    await liveApp.chat(session, live, `start a tester on ${task?.id} run: ${CLONE_AND_TEST(setting("LIVE_GITHUB_REPO"))}`, request);
    const ended = await until(async () => {
      // The app numbers a manager's runs itself: the task says which is its own.
      const runId = (await liveApp.board(session, live)).tasks.find(({ id }) => id === task?.id)?.runs[0];
      if (runId === undefined) return undefined;
      const found = await liveApp.run(session, live, runId);
      return found.run?.state === "ended" ? found : undefined;
    }, 6 * MINUTE);
    expect(ended, "the run did not end").toBeDefined();
    // The run's report, read over the API, says the tests passed; and no token is in anything it shows.
    expect(ended?.run.report).toBe("ready");
    expect(ended?.run.note).toMatch(/pass\s+\d+/u);
    expect(ended?.run.note).not.toMatch(/fail\s+[1-9]/u);
    expect(JSON.stringify(ended)).not.toMatch(/ghs_|ghp_|github_pat_|x-access-token:[A-Za-z0-9_]/u);
  },
  8 * MINUTE,
);
