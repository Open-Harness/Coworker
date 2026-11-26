import { describe, expect, it } from "vitest";
import { quiet, until } from "../flows/kit.ts";
import { saysDone, takes } from "../flows/scripts.ts";
import { HANDED_IN } from "./answers.ts";
import { asked, pulled, real } from "./kit.ts";
import type { Rule } from "../world/models.ts";

/** A doer that hands in what is written down, and a real checker. What is wrong is sent back; what is right is not. */
const bytes = (text: string): string => btoa(String.fromCodePoint(...new TextEncoder().encode(text)));
const handsIn = (files: Readonly<Record<string, string>>): readonly Rule[] => {
  const parts = Object.entries(files).map(([path, text]) => `mkdir -p "$(dirname ${path})" && echo ${bytes(text)} | base64 -d > ${path}`);
  return [
    ...saysDone,
    { tool: "bash", sees: "Make the change in the clone", start: true, do: { call: "bash", args: { command: `${parts.join(" && ")} && git add -A && git commit -qm "Fix"` } } },
    { after: "bash", tool: "report", do: { call: "report", args: { result: "done", says: "Mended, with a test.", evidence: [{ check: "tests", met: true, says: "node --test passed" }] } } },
    { tool: "github_push", sees: "Open the pull request", start: true, do: { call: "github_push", args: {} } },
    { after: "github_push", tool: "github_open_pull_request", do: { call: "github_open_pull_request", args: { title: "Fix", body: "For #1" } } },
    { sees: "[Ss]ent back|is wrong|not met", start: true, times: "always", do: { call: "report", args: { result: "stuck", says: "I cannot do better.", evidence: [] } } },
  ];
};

describe.concurrent("checking", () => {
  for (const { id, job, files, wrong } of HANDED_IN)
    it(`jobs:check/${id}`, async () => {
      const f = await real();
      const repo = await f.repo(job.files);
      const manager = await f.manager(repo, { test: "node --test test/*.test.js", doer: f.scripted.doer, reviewer: f.real.reviewer, judge: f.scripted.judge, perWork: "5" });
      await f.script(f.models.judge, [takes(manager)]);
      await f.script(f.models.doer, handsIn(files));
      await asked(f, repo, job);
      if (wrong === null) {
        expect(await pulled(repo, 6 * 60_000)).toHaveLength(1);
        return;
      }
      await until(
        repo,
        async () => [(await f.seen(f.models.doer)).some(({ told }) => /sent back|is wrong|not met/iu.test(told)), (await repo.pulls()).length > 0] as const,
        ([back, pull]) => back || pull,
        "it was checked",
        6 * 60_000,
      );
      await quiet(repo, () => repo.pulls(), 3000);
      expect(await repo.pulls(), `Not sent back: ${wrong}`).toEqual([]);
    });
});
