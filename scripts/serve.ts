import { spawn, spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { readSettings } from "./settings.ts";

/**
 * Runs the build in workerd with `wrangler dev --local`: local D1, local Durable Objects, no account. Everything people
 * write is in `<state>`; `--clean` deletes it first. `--world fake` builds every outside service from its fake.
 */
const { values } = parseArgs({
  options: {
    port: { type: "string", default: "8787" },
    state: { type: "string", default: ".run" },
    world: { type: "string", default: "real" },
    clean: { type: "boolean" },
  },
});
const CONFIG = "dist/server/wrangler.json";
if (!existsSync(CONFIG)) {
  console.error("Not built; run pnpm build first");
  process.exit(1);
}
const state = resolve(values.state);
if (values.clean === true) rmSync(state, { recursive: true, force: true });

const settings = readSettings();
const fake = values.world === "fake";
/** The fake world signs people in with a fixed secret; a real one must be given its own. */
const secret = settings["BETTER_AUTH_SECRET"] ?? (fake ? "fake-world-only-secret-0123456789abcdef" : undefined);
if (secret === undefined) {
  console.error("Set BETTER_AUTH_SECRET in .env.local, or run with --world fake");
  process.exit(1);
}
const vars = {
  ...settings,
  BETTER_AUTH_SECRET: secret,
  DT_APP_URL: `http://localhost:${values.port}`,
  ...(fake ? { DT_WORLD: "fake" } : {}),
};

const wrangler = resolve("node_modules/.bin/wrangler");
const common = ["-c", "wrangler.json", "--persist-to", state];
const migrated = spawnSync(wrangler, ["d1", "migrations", "apply", "AUTH", "--local", ...common], { cwd: "dist/server", stdio: "inherit" });
if (migrated.status !== 0) process.exit(migrated.status ?? 1);

const dev = spawn(
  wrangler,
  [
    "dev",
    "--local",
    "--port",
    values.port,
    "--ip",
    "127.0.0.1",
    ...common,
    ...Object.entries(vars).flatMap(([key, value]) => ["--var", `${key}:${value}`]),
  ],
  { cwd: "dist/server", stdio: "inherit" },
);
dev.on("error", (error) => {
  console.error(`wrangler did not start: ${error.message}`);
  process.exit(1);
});
dev.on("exit", (code) => process.exit(code ?? 1));
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => dev.kill(signal));
