import { defineConfig } from "vitest/config";
import flows from "../flows/vitest.config.ts";

/** The flows' worker and world, with a real model behind `https://models.jobs.test`. Costs money: only when somebody asks. */
export default defineConfig({
  ...flows,
  test: { ...flows.test, name: "jobs", include: ["evals/jobs/**/*.eval.ts"], testTimeout: 15 * 60_000, hookTimeout: 120_000, maxConcurrency: 4 },
});
