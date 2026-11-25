import { spawnSync } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";

/**
 * `pnpm credentials run pnpm staging:until-green`: one unlock for the whole job. Deploys main to staging and runs the live
 * tests; when they fail it waits for the next commit on main and does it again, and when they pass it counts them with
 * `pnpm score --live` and ends. It never deploys any branch but main, and only when the checkout has nothing uncommitted
 * but the score. Ctrl-C ends it, and it gives up by itself after `HOURS`.
 */
const HOURS = 12;
const LOOK_EVERY_MS = 15_000;

const git = (...args: string[]): string => spawnSync("git", args, { encoding: "utf8" }).stdout.trim();
const passes = (...argv: string[]): boolean => {
  console.log(`\n== ${argv.join(" ")}`);
  return spawnSync(argv[0] ?? "", argv.slice(1), { stdio: "inherit" }).status === 0;
};

/** What a deploy is made of: the score and the docs change nothing on staging. */
const PARTS = ["--", ".", ":!status", ":!docs"];
const changedSince = (commit: string): boolean => spawnSync("git", ["diff", "--quiet", commit, "HEAD", ...PARTS]).status !== 0;

function whyNot(): string | undefined {
  if (git("branch", "--show-current") !== "main") return "This checkout is not on main.";
  return git("status", "--porcelain", "--untracked-files=no", ...PARTS) === "" ? undefined : "Something is not committed.";
}

/** Waits, once saying why, until `reason` has none. */
async function waitOut(reason: () => string | undefined): Promise<void> {
  const why = reason();
  if (why !== undefined) console.log(`\n#### ${why} Nothing to type.`);
  while (Date.now() < until && reason() !== undefined) await wait(LOOK_EVERY_MS);
}

/** A live test waits on real mail and GitHub, so one that fails is run once more before a fix is asked for. */
const areTestsGreen = (): boolean => passes("pnpm", "test:live", "--reporter=verbose") || passes("pnpm", "test:live", "--reporter=verbose");

const until = Date.now() + HOURS * 3_600_000;
while (Date.now() < until) {
  await waitOut(whyNot);
  const commit = git("rev-parse", "HEAD");
  console.log(`\n#### ${git("log", "-1", "--format=%h %s")}`);
  const isGreen =
    passes("pnpm", "install", "--frozen-lockfile") &&
    passes("pnpm", "staging", "--apply") &&
    areTestsGreen() &&
    passes("pnpm", "score", "--live");
  if (isGreen) process.exit(0);
  await waitOut(() => (changedSince(commit) ? undefined : `Not green at ${commit.slice(0, 7)}. Waiting for the next commit on main.`));
}
console.error(`Not green after ${HOURS} hours.`);
process.exit(1);
