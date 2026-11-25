import { fileURLToPath } from "node:url";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { configDefaults, defineConfig } from "vitest/config";
import { oauthProviders } from "./src/modules/auth/testing.ts";
import { slackApi } from "./src/modules/chat-sdk/testing.ts";
import { modelProviders } from "./src/modules/models/testing.ts";

const source = fileURLToPath(new URL("./src", import.meta.url));
const pages = fileURLToPath(new URL("./test/pages.ts", import.meta.url));
const setup = fileURLToPath(new URL("./test/setup.ts", import.meta.url));
const pageSetup = fileURLToPath(new URL("./test/page-setup.ts", import.meta.url));
const controlMigrations = await readD1Migrations(fileURLToPath(new URL("./migrations/control", import.meta.url)));

/** The outside web for the fast tier. Any host no fake answers gets 502, so a test never reaches the internet. */
async function outside(request: Request): Promise<Response> {
  for (const answer of [oauthProviders, modelProviders, slackApi]) {
    const response = await answer(request);
    if (response !== undefined) return response;
  }
  return new Response(`The fast tier has no internet: ${new URL(request.url).host}`, { status: 502 });
}

/** Never a real provider, whatever .env holds. */
const bindings = {
  ANTHROPIC_API_KEY: "",
  OPENAI_API_KEY: "",
  PI_EXP_PROXY_URL: "",
  PI_EXP_FAKE_MODEL: "1",
  PI_EXP_ADMINS: "admin@example.test",
  PI_EXP_DEFAULT_MODEL: "fake/scripted",
  DT_WORLD: "fake",
  DT_APP_URL: "http://app.test",
  BETTER_AUTH_SECRET: "test-secret-that-is-at-least-32-characters-long",
  // Sign-in with GitHub against the fake OAuth endpoints of `outside` below.
  GITHUB_CLIENT_ID: "test-github-client",
  GITHUB_CLIENT_SECRET: "test-github-secret",
};

/** The tests of a manager that thinks through its workspace. They run in their own project, which sets that up. */
const WORKSPACE_MODEL = "src/**/*.workspace-model.test.ts";

/** A project that runs in workerd, with the fake outside web and `extra` settings on top of the fake world's. */
const serverProject = (name: string, include: string[], exclude: string[], extra: Record<string, string> = {}) => ({
  resolve: { alias: { "~": source, "@tanstack/react-start/server-entry": pages } },
  // Workerd cannot read Vitest 5's host-filesystem module cache.
  test: { name, include, exclude: [...configDefaults.exclude, ...exclude], setupFiles: [setup], fsModuleCache: false, testTimeout: 30_000 },
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: { bindings: { ...bindings, ...extra, TEST_MIGRATIONS: controlMigrations }, outboundService: outside },
    }),
  ],
});

export default defineConfig({
  test: {
    projects: [
      serverProject("server", ["src/**/*.test.ts"], [WORKSPACE_MODEL]),
      // Managers think with their workspace's own model connection instead of the script: the path a deployment takes.
      serverProject("workspace-model", [WORKSPACE_MODEL], [], { DT_MANAGER_MODEL: "workspace" }),
      {
        resolve: { alias: { "~": source } },
        test: { name: "page", include: ["src/**/*.test.tsx"], environment: "happy-dom", setupFiles: [pageSetup], testTimeout: 30_000 },
      },
    ],
  },
});
