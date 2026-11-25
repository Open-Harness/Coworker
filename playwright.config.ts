import { defineConfig } from "@playwright/test";

/** Another worktree running its own at the same time sets E2E_PORT. */
const PORT = Number(process.env.E2E_PORT ?? 8799);

/** The finished build in workerd, in the fake world: scripted model, fake mail, no keys, no network. Needs `pnpm build`. */
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  use: { baseURL: `http://localhost:${PORT}`, viewport: { width: 1440, height: 900 }, trace: "retain-on-failure" },
  webServer: {
    command: `node scripts/serve.ts --port ${PORT} --state .run-e2e --clean --world fake`,
    url: `http://localhost:${PORT}/api/health`,
    timeout: 120_000,
    env: { ANTHROPIC_API_KEY: "", OPENAI_API_KEY: "", PI_EXP_PROXY_URL: "", PI_EXP_PROXY_KEY: "", BETTER_AUTH_SECRET: "" },
    gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
  },
});
