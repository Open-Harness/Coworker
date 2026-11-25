import { describe, expect, it } from "vitest";
import { sandboxWorld } from "~/modules/sandboxes/testing.ts";
import type { EnvironmentView, SaveResult } from "~/modules/sandboxes/types.ts";
import { eventually, json } from "../../test/flows.ts";
import { board, runOf, say, team, type Team } from "../../test/team.ts";

const TOKEN = "ghs_fake_installation_token_0451";
const SETUP = ["git clone https://github.com/acme/app", "pnpm install", "export GITHUB_TOKEN=vault:github"].join("\n");

const environments = async ({ owner, workspace }: Team): Promise<readonly EnvironmentView[]> =>
  (await json<{ environments: readonly EnvironmentView[] }>(await owner.send("GET", `${workspace}/environments`))).environments;

/** A task, and a run on it that runs `command`, waited for until it reports. */
async function runOn(launch: Team, title: string, command: string, n: number) {
  await say(launch, `add a task: ${title}`, `task-${n}`);
  await eventually(
    () => board(launch),
    ({ tasks }) => tasks.length === n,
  );
  await say(launch, `start a tester on DT-${n} run: ${command}`, `run-${n}`);
  return eventually(
    () => runOf(launch, `run-${n}`),
    ({ run }) => run?.state === "ended",
    20_000,
  );
}

describe("sandboxes", () => {
  it("flw:sandbox/run", async () => {
    const launch = await team("sandboxrun");
    const { owner, workspace } = launch;
    expect((await owner.send("PUT", `${workspace}/secrets/github`, { value: TOKEN })).status).toBe(200);
    const saved = await json<SaveResult>(
      await owner.send("PUT", `${workspace}/environments`, { name: "app", setup: SETUP, size: "2 vCPU · 4 GB" }),
    );
    if (saved._tag !== "Saved") throw new Error(saved._tag);
    const { id } = saved.environment;
    expect((await owner.send("PUT", `${workspace}/agents/Worker/environment`, { environment: id })).status).toBe(200);
    sandboxWorld.script("pnpm test", { stdout: "12 passed", seconds: 90 });
    sandboxWorld.script("echo $GITHUB_TOKEN", (env) => ({ stdout: env["GITHUB_TOKEN"] ?? "" }));

    const first = await runOn(launch, "Run the tests", "pnpm test", 1);
    expect(first.run).toMatchObject({ agent: "Worker", report: "ready", note: expect.stringContaining("12 passed") });
    const second = await runOn(launch, "Show the token", "echo $GITHUB_TOKEN", 2);

    // The setup ran once for both runs, in the agent's environment.
    const setups = sandboxWorld.prepared.filter(({ key }) => key.startsWith(`${id}:`));
    expect(setups).toHaveLength(1);
    expect(setups[0]).toMatchObject({
      key: `${id}:1`,
      size: "2 vCPU · 4 GB",
      script: "git clone https://github.com/acme/app\npnpm install",
    });
    const commands = sandboxWorld.ran.filter(({ image }) => image === `image:${id}:1`);
    expect(commands.map(({ command }) => command)).toEqual(["pnpm test", "echo $GITHUB_TOKEN"]);

    // The secret reached the container by name, as its environment, and nowhere as a value in a script or a file.
    for (const { env } of [...setups, ...commands]) expect(env).toEqual({ GITHUB_TOKEN: TOKEN });
    for (const { script } of setups) expect(script).not.toContain(TOKEN);
    const [shown] = await environments(launch);
    expect(shown).toMatchObject({ name: "app", setup: SETUP, status: "Ready", usedBy: ["Worker"], version: 1 });
    expect(JSON.stringify(shown)).not.toContain(TOKEN);

    // What the run saw of it is the name, never the value.
    expect(second.run.note).toContain("[secret github]");
    expect(JSON.stringify(second)).not.toContain(TOKEN);
  }, 120_000);
});
