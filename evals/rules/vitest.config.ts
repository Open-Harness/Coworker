import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** The rules: pure modules, in node, in seconds. `CONTRACT_SRC` runs them against another copy of `src`. */
const source = process.env["CONTRACT_SRC"] ?? fileURLToPath(new URL("../../src", import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL("../..", import.meta.url)),
  resolve: { alias: { "~": source } },
  test: { name: "rules", include: ["evals/rules/**/*.eval.ts"], environment: "node", testTimeout: 30_000 },
});
