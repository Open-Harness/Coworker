import { describe, expect, it } from "vitest";
import { flow } from "./kit.ts";
import { asks, pulled, ready } from "./ready.ts";
import { checksIt, FIX, saysDone } from "./scripts.ts";
import type { Rule } from "../world/models.ts";

/*
 * What a real model does that the scripts did not: it edits, runs the tests, and asks to push with a commit message, leaving the commit to the
 * push. Found by the jobs on 2026-11-26: the push bundled nothing, the work waited for ever, and no pull request came.
 */

const editsOnly: readonly Rule[] = [
  { tool: "bash", sees: "Make the change in the clone", start: true, do: { call: "bash", args: { command: `printf '%s\\n' '${FIX}' > add.sh` } } },
  { after: "bash", tool: "report", do: { call: "report", args: { result: "done", says: "It adds now.", evidence: [{ check: "tests", met: true, says: "sh test.sh passed" }] } } },
];
const pushesWithAMessage = (message: string): readonly Rule[] => [
  { tool: "github_push", sees: "Open the pull request", start: true, do: { call: "github_push", args: { message } } },
  { after: "github_push", tool: "github_open_pull_request", do: { call: "github_open_pull_request", args: { title: "Add, do not subtract", body: "It subtracted." } } },
];

describe("the push", () => {
  it("flow:repo/a-change-left-uncommitted-is-committed-with-its-message-and-pushed", async () => {
    const f = await flow();
    const { repo } = await ready(f);
    await f.script(f.models.doer, [...saysDone, ...editsOnly, ...pushesWithAMessage("Add, do not subtract")]);
    await f.script(f.models.reviewer, checksIt());
    await asks(f, repo);
    const [pull] = await pulled(repo);
    const { text } = await repo.does<{ text: string | null }>("file", { branch: pull?.pull.head.ref ?? "", path: "add.sh" });
    expect(text?.trim()).toBe(FIX);
  });

});
