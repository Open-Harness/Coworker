import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { liveSettings } from "./src/bin/live-settings.ts";
import { live } from "./src/modules/live/service.ts";

/**
 * The live tier: tests of staging from outside (`live/*.live.test.ts`), run by `pnpm test:live` and `pnpm score --live`,
 * never by `pnpm test` or `pnpm score`. The settings come from the shell and `.dev.vars` (names in `.dev.vars.example`);
 * a test whose settings are missing is skipped, and the missing names are printed here.
 */
const settings = liveSettings();
for (const { id, missing } of live.skipped(settings)) console.warn(`SKIPPED ${id}: missing ${missing.join(", ")}`);

export default defineConfig({
  resolve: { alias: { "~": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    name: "live",
    include: ["live/**/*.live.test.ts"],
    environment: "node",
    // One at a time: they share one mailbox pair, one repo and one staging Worker.
    fileParallelism: false,
    testTimeout: 120_000,
    env: settings,
  },
});
