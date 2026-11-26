import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const root = fileURLToPath(new URL("../..", import.meta.url));
const [PORT, DESIGN] = [Number(process.env["SCREENS_PORT"] ?? 8810), Number(process.env["DESIGN_PORT"] ?? 5311)];
const itself = process.env["SCREENS_AGAINST"] === "design";

/** The finished build, its requests answered from fixtures, beside the drawings. Needs `pnpm build`. */
export default defineConfig({
  testDir: ".",
  testMatch: "*.eval.ts",
  timeout: 60_000,
  workers: 4,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    viewport: { width: 1440, height: 900 },
    timezoneId: "Europe/Copenhagen",
    locale: "en-GB",
    colorScheme: "light",
    contextOptions: { reducedMotion: "reduce" },
  },
  webServer: [
    { command: "node_modules/.bin/vite --config design/vite.config.mjs design", cwd: root, url: `http://localhost:${DESIGN}`, env: { PORT: String(DESIGN) }, timeout: 60_000 },
    ...(itself
      ? []
      : [
          {
            command: `node scripts/serve.ts --port ${PORT} --state .run-screens --clean --world fake`,
            cwd: root,
            url: `http://localhost:${PORT}/api/health`,
            timeout: 120_000,
            env: { ANTHROPIC_API_KEY: "", OPENAI_API_KEY: "", BETTER_AUTH_SECRET: "" },
          },
        ]),
  ],
});
