import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** The world's own tests. They are green, and say the fakes can be believed. */
export default defineConfig({
  root: fileURLToPath(new URL("../..", import.meta.url)),
  resolve: { alias: { "~": fileURLToPath(new URL("../../src", import.meta.url)) } },
  test: { name: "world", include: ["evals/world/*.test.ts"], testTimeout: 30_000 },
});
