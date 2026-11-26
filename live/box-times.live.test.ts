import { expect, it } from "vitest";
import { liveApp } from "~/modules/liveapp/service.ts";
import type { EnvironmentView, SaveResult } from "~/modules/sandboxes/types.ts";
import { setting, staging, until } from "./support.ts";

/*
 * Not a test of anything: it measures the boxes once, for docs/github-plan.md slice 0. Run it with
 * `BOX_TIMES=1 pnpm credentials run pnpm test:live live/box-times`. Nothing needs deploying. It uses the live workspace's
 * own environment `box-times`, and gives the agent `Worker` back the one it had.
 */
const MINUTE = 60_000;
const REPO = "https://github.com/Open-Harness/Coworker.git";
const timed = (name: string, command: string): string =>
  `s=$(date +%s); ${command} >/tmp/out 2>&1; echo "${name}: $(( $(date +%s)-s ))s exit $?"`;
const INSTALL = [
  "cd /workspace",
  `git clone -q --depth 1 ${REPO} repo`,
  "cd repo",
  "npm i -g pnpm@11.20.0 >/dev/null",
  "pnpm install --frozen-lockfile",
];
const NOTHING = 'echo "$(nproc) cores, $(du -sh /workspace | cut -f1) in /workspace"';
const CHECK = `cd /workspace/repo; ${["build", "typecheck", "lint", "check:ui"].map((name) => timed(name, `pnpm ${name}`)).join("; ")}`;
const ONE_TEST_FILE = `cd /workspace/repo; ${timed("one test file", "pnpm exec vitest --run --project server src/worlds.test.ts")}; tail -3 /tmp/out`;
const TESTS = `cd /workspace/repo; ${timed("all tests", "timeout 540 pnpm test")}; tail -4 /tmp/out`;

it.skipIf(process.env["BOX_TIMES"] !== "1" || setting("LIVE_STAGING_URL") === "")(
  "box times",
  async () => {
    const { session, live } = await staging({ sandbox: true });
    const path = live.workspace;
    const { environments } = await session.json<{ environments: readonly EnvironmentView[] }>("GET", `${path}/environments`);
    const before = environments.find(({ name }) => name === "app")?.id;
    const made = environments.find(({ name }) => name === "box-times")?.id;
    const saved = await session.json<SaveResult>("PUT", `${path}/environments`, {
      ...(made === undefined ? {} : { id: made }),
      name: "box-times",
      setup: INSTALL.join(" && "),
      size: "4 vCPU · 8 GB",
    });
    if (saved._tag !== "Saved") throw new Error(`The environment was not saved: ${saved._tag}`);
    const put = (environment: string) => session.send("PUT", `${path}/agents/Worker/environment`, { environment });
    expect((await put(saved.environment.id)).ok).toBe(true);
    try {
      // The first also runs the setup: clone, install, snapshot. The second starts from that snapshot and does nothing.
      for (const [name, command] of [
        ["setup, then nothing", NOTHING],
        ["restore, then nothing", NOTHING],
        ["check", CHECK],
        ["one test file", ONE_TEST_FILE],
        ["all tests", TESTS],
      ] as const) {
        const had = new Set((await liveApp.board(session, live)).tasks.map(({ id }) => id));
        await liveApp.chat(session, live, `add a task: Box times ${name} ${Date.now()}`, `box-${Date.now()}`);
        const task = await until(async () => (await liveApp.board(session, live)).tasks.find(({ id }) => !had.has(id)), MINUTE);
        const started = Date.now();
        await liveApp.chat(session, live, `start a tester on ${task?.id} run: ${command}`, `box-run-${started}`);
        const ended = await until(async () => {
          const id = (await liveApp.board(session, live)).tasks.find((one) => one.id === task?.id)?.runs[0];
          const found = id === undefined ? undefined : await liveApp.run(session, live, id);
          return found?.run.state === "ended" ? found : undefined;
        }, 18 * MINUTE);
        console.log(`\n${name}: ${((Date.now() - started) / 1000).toFixed(0)} s in all\n${ended?.run.note ?? "did not end"}`);
      }
    } finally {
      if (before !== undefined) await put(before);
    }
  },
  70 * MINUTE,
);
