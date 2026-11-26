import { fileURLToPath } from "node:url";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";
import { APP_ID, APP_KEY, outside, WEBHOOK_SECRET } from "../world/outside.ts";

const at = (path: string): string => fileURLToPath(new URL(`../../${path}`, import.meta.url));

/**
 * The whole Worker in workerd, on its real adapters, with everything outside it answered by `evals/world`. What a
 * deployment is told by its settings, it is told here, and `DT_OUTSIDE=http` says: containers and the push are the ones in
 * `src/modules/boxes/testing.ts`, GitHub is the real adapter, models are the workspace's own, and time is `worldClock`.
 */
export default defineConfig({
  root: at(""),
  resolve: { alias: { "~": at("src"), "@tanstack/react-start/server-entry": at("test/pages.ts") } },
  test: {
    name: "flows",
    include: ["evals/flows/**/*.eval.ts"],
    setupFiles: [at("test/setup.ts")],
    fsModuleCache: false,
    testTimeout: 90_000,
    hookTimeout: 60_000,
  },
  plugins: [
    cloudflareTest({
      wrangler: { configPath: at("wrangler.jsonc") },
      miniflare: {
        bindings: {
          DT_WORLD: "fake",
          DT_OUTSIDE: "http",
          DT_MANAGER_MODEL: "workspace",
          DT_APP_URL: "http://app.test",
          DT_MAIL_DOMAIN: "co-worker.test",
          BETTER_AUTH_SECRET: "test-secret-that-is-at-least-32-characters-long",
          GITHUB_APP_ID: APP_ID,
          GITHUB_APP_PRIVATE_KEY: APP_KEY,
          GITHUB_APP_SLUG: "juno-test",
          GITHUB_APP_CLIENT_ID: "flows-client",
          GITHUB_APP_CLIENT_SECRET: "flows-client-secret",
          GITHUB_WEBHOOK_SECRET: WEBHOOK_SECRET,
          PI_EXP_FAKE_MODEL: "1",
          PI_EXP_DEFAULT_MODEL: "fake/scripted",
          TEST_MIGRATIONS: await readD1Migrations(at("migrations/control")),
        },
        outboundService: outside as never,
      },
    }),
  ],
});
