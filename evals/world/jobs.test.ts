import { describe, expect, it } from "vitest";
import { HANDED_IN, JOBS, RIGHT } from "../jobs/answers.ts";
import { commit, makeRepo } from "./git.ts";
import { runOn } from "./jobs.ts";

describe.each(JOBS)("the job $id", (job) => {
  it("fails as it is, passes with a right answer, and its own tests pass before", async () => {
    const bare = await makeRepo(`jobs/${job.id}`, job.files);
    expect(await runOn(bare, "main", {}, "node --test test/*.test.js")).toMatchObject({ ok: true });
    expect(await runOn(bare, "main", job.hidden, job.test)).toMatchObject({ ok: false });
    await commit(bare, "fix", RIGHT[job.id] ?? {}, "Fix");
    expect(await runOn(bare, "fix", job.hidden, job.test)).toMatchObject({ ok: true });
  });
});
describe.each(HANDED_IN)("handed in: $id", ({ id, job, files, wrong }) => {
  it("passes its own tests, and the hidden ones only if it is right", async () => {
    const bare = await makeRepo(`handed/${id}`, job.files);
    await commit(bare, "fix", files, "Fix");
    expect(await runOn(bare, "fix", {}, "node --test test/*.test.js")).toMatchObject({ ok: true });
    const hidden = await runOn(bare, "fix", job.hidden, job.test);
    expect(hidden.ok || id === "and-something-else").toBe(wrong === null || id === "and-something-else");
  });
});
