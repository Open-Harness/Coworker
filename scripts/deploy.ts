import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readSettings } from "./settings.ts";
import { stage } from "./stage.ts";

/** Writes the build and its settings to the fleet bucket. Running nodes pick it up by themselves. Extra arguments go to celld. */
const directory = mkdtempSync(join(tmpdir(), "pi-exp-"));
let status = 1;
try {
  stage(directory, readSettings());
  const result = spawnSync("celld", ["deploy", directory, ...process.argv.slice(2)], { stdio: "inherit" });
  if (result.error !== undefined) console.error(`celld did not start: ${result.error.message}. README.md says how to install it.`);
  status = result.status ?? 1;
} finally {
  rmSync(directory, { recursive: true, force: true });
}
process.exit(status);
