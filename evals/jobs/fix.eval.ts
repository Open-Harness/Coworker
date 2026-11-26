import { describe, expect, it } from "vitest";
import { takes } from "../flows/scripts.ts";
import { JOBS } from "./answers.ts";
import { asked, hidden, pulled, real } from "./kit.ts";

/** An issue to a pull request, by a real model, checked by another. Right is what the hidden tests say. */
describe.concurrent("fixing", () => {
  for (const job of JOBS)
    it(`jobs:fix/${job.id}`, async () => {
      const f = await real();
      const repo = await f.repo(job.files);
      const manager = await f.manager(repo, { test: "node --test", doer: f.real.doer, reviewer: f.real.reviewer, judge: f.scripted.judge, perWork: "5" });
      await f.script(f.models.judge, [takes(manager)]);
      await asked(f, repo, job);
      const [pull] = await pulled(repo, 12 * 60_000);
      const ran = await hidden(repo, pull.pull.head.ref, job);
      expect(ran, ran.says).toMatchObject({ ok: true });
      for (const path of job.untouched ?? []) {
        const { text } = await repo.does<{ text: string | null }>("file", { branch: pull.pull.head.ref, path });
        expect(text?.trim(), `${path} is as it was`).toBe(job.files[path]?.trim());
      }
      expect(pull.body, "it says which issue it is for").toMatch(/#1\b/u);
      expect(pull.pull.changed_files ?? 0).toBeLessThanOrEqual(6);
    });
});
