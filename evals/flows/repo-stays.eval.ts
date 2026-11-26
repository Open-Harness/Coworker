import { describe, expect, it } from "vitest";
import { DAY, flow, pass, quiet, until, world, type Repo } from "./kit.ts";
import { asks, opened, pulled, ready, waiting, workOf } from "./ready.ts";

/** Journey 6 to 11: it stays with its pull request until it is merged, closed and told. */
const FIXES_IT = (words: string, command: string) => ({ tool: "bash", sees: words, start: true as const, do: { call: "bash", args: { command } } });
const commitOf = (file: string, text: string) => `printf '%s\\n' '${text}' > ${file} && git add -A && git commit -qm 'As asked'`;
const pushes = { after: "bash", tool: "github_push", times: "always" as const, do: { call: "github_push", args: {} } };
const threadOf = (repo: Repo, number: number) => repo.issue(number);

describe("a review", () => {
  it("flow:repo/a-line-comment-is-done-pushed-and-answered-on-its-line", async () => {
    const f = await flow();
    const { repo, pull, branch } = await opened(f);
    const before = (await threadOf(repo, pull)).pull.head.sha;
    await f.script(f.models.doer, [
      FIXES_IT("Say it in the README", commitOf("README.md", "# Adds two numbers")),
      pushes,
      { after: "github_push", sees: "comment (?:id )?(\\d{4,})", do: { call: "github_reply_on_line", args: { comment: "$1", text: "Done, in the README." } } },
    ]);
    const { id } = await repo.does("line", { by: f.ama.login, number: pull, path: "add.sh", line: 1, text: "Say it in the README too" });
    const { pull: now } = await until(repo, () => repo.issue(pull), (one) => one.pull.lines.some((line: any) => line.by === "juno-test[bot]"), "an answer on the line");
    expect(now.lines.find((line: any) => line.by === "juno-test[bot]")).toMatchObject({ answers: id, body: "Done, in the README." });
    expect(now.head.sha).not.toBe(before);
    expect((await repo.does("file", { branch, path: "README.md" })).text).toBe("# Adds two numbers");
  });

  it("flow:repo/what-comes-later-goes-to-the-same-work-with-no-second-judgement", async () => {
    const f = await flow();
    const { repo, manager, pull, work } = await opened(f);
    const judged = (await f.seen(f.models.judge)).length;
    await repo.does("review", { by: f.ama.login, number: pull, state: "CHANGES_REQUESTED", text: "Please name it better" });
    await repo.does("comment", { by: "a-stranger", number: 1, text: "Any news?" });
    await until(repo, () => f.seen(f.models.doer), (seen) => seen.some(({ told }) => told.includes("Please name it better")), "the doer was told");
    await quiet(repo, () => repo.pulls());
    expect((await f.seen(f.models.judge)).length).toBe(judged);
    expect((await f.ama.see("/m/:manager/board", { manager })).cards.map((card) => card.work.id)).toEqual([work]);
  });

  it("flow:repo/a-thread-that-follows-knows-what-it-did-before", async () => {
    const f = await flow();
    const { repo, pull } = await opened(f);
    await repo.does("review", { by: f.ama.login, number: pull, state: "CHANGES_REQUESTED", text: "Please name it better" });
    const seen = await until(repo, () => f.seen(f.models.doer), (all) => all.some(({ told }) => told.includes("Please name it better")), "the doer was told");
    const later = seen.find(({ told }) => told.includes("Please name it better"));
    expect(later?.told).toContain("Understood: it subtracts.");
  });
});

describe("checks", () => {
  it("flow:repo/a-failed-check-is-read-fixed-and-pushed", async () => {
    const f = await flow();
    const { repo, pull } = await opened(f);
    const before = (await repo.issue(pull)).pull.head.sha;
    await f.script(f.models.doer, [
      { tool: "github_read", sees: "lint", start: true, do: { call: "github_read", args: { what: "log" } } },
      { after: "github_read", sees: "line 1: missing newline", do: { call: "bash", args: { command: commitOf("add.sh", "# adds\necho $(($1 + $2))") } } },
      pushes,
    ]);
    await repo.does("check", { number: pull, name: "lint", conclusion: "failure", log: "line 1: missing newline" });
    await until(repo, () => repo.issue(pull), (one) => one.pull.head.sha !== before, "a new push");
  });
  it("flow:repo/a-passed-check-is-known-and-shown", async () => {
    const f = await flow();
    const { repo, manager, pull, work } = await opened(f);
    await repo.does("check", { number: pull, name: "test", conclusion: "success", log: "" });
    const view = await until(repo, () => workOf(f, manager, work), ({ activity }) => activity.some(({ text }) => /test/iu.test(text) && /pass/iu.test(text)), "the work says the check passed");
    expect(view.work.ended).toBeNull();
  });
});

describe("main moves", () => {
  it("flow:repo/a-conflict-is-told-and-put-right", async () => {
    const f = await flow();
    const { repo, pull } = await opened(f);
    await f.script(f.models.doer, [
      FIXES_IT("main", "git fetch -q origin main 2>/dev/null; git status --short; true"),
    ]);
    await repo.does("push", { by: f.ama.login, branch: "main", files: { "add.sh": "echo $(($1 - $2)) # minus\n" }, message: "A comment" });
    const seen = await until(repo, () => f.seen(f.models.doer), (all) => all.some(({ told }) => /conflict|no longer (?:merges|applies)/iu.test(told)), "the doer was told that it conflicts");
    expect(seen.length).toBeGreaterThan(0);
    expect((await repo.issue(pull)).state).toBe("open");
  });
  it("flow:repo/a-push-that-does-not-touch-it-wakes-nobody", async () => {
    const f = await flow();
    const { repo } = await opened(f);
    await quiet(repo, () => repo.pulls());
    const before = (await f.seen(f.models.doer)).length;
    await repo.does("push", { by: f.ama.login, branch: "main", files: { "other.txt": "x\n" }, message: "Unrelated" });
    await quiet(repo, () => repo.pulls(), 2500);
    expect((await f.seen(f.models.doer)).length).toBe(before);
  });
});

describe("the end", () => {
  it("flow:repo/merged-means-closed-told-done-and-the-box-gone", async () => {
    const f = await flow();
    const { repo, manager, pull, work } = await opened(f);
    await repo.does("merge", { by: f.ama.login, number: pull });
    const view = await until(repo, () => workOf(f, manager, work), ({ work: one }) => one.ended !== null, "the work ended");
    expect(view.work).toMatchObject({ ended: { as: "done" }, next: null });
    await quiet(repo, () => repo.issue(1));
    const issue = await repo.issue(1);
    expect(issue.state).toBe("closed");
    expect(issue.comments.filter((one: any) => one.by === "juno-test[bot]").at(-1).body).toMatch(new RegExp(`^Merged #${pull}`, "u"));
    expect((await repo.look()).boxes.some((box) => box.there)).toBe(false);
  });
  it("flow:repo/closed-without-merging-means-dropped-with-the-reason-and-told", async () => {
    const f = await flow();
    const { repo, manager, pull, work } = await opened(f);
    await repo.does("comment", { by: f.ama.login, number: pull, text: "We do not want this after all" });
    await repo.does("close", { by: f.ama.login, number: pull });
    const view = await until(repo, () => workOf(f, manager, work), ({ work: one }) => one.ended !== null, "the work ended");
    expect(view.work.ended).toMatchObject({ as: expect.stringMatching(/dropped|no/u), why: expect.stringMatching(/closed/iu) });
  });
  it("flow:repo/twice-and-backwards-is-the-same-end", async () => {
    const f = await flow();
    const { repo, manager, pull, work } = await opened(f);
    await repo.does("check", { number: pull, name: "test", conclusion: "success", log: "" });
    await repo.does("review", { by: f.ama.login, number: pull, state: "APPROVED", text: "Good" });
    await repo.does("merge", { by: f.ama.login, number: pull });
    await repo.deliver({ twice: true, backwards: true });
    const view = await until(repo, () => workOf(f, manager, work), ({ work: one }) => one.ended !== null, "the work ended");
    expect(view.work.ended?.as).toBe("done");
    const said = await quiet(repo, () => repo.said(1));
    // It says so once, as `Merged #<n>` (work README), however often it was heard.
    expect(said.filter((text) => text.startsWith(`Merged #${pull}`))).toHaveLength(1);
  });
  it("flow:repo/stop-from-someone-who-may-ask-stops-for-good", async () => {
    const f = await flow();
    const { repo, manager, work } = await opened(f);
    await repo.does("comment", { by: f.ama.login, number: 1, text: "@juno-test stop" });
    const view = await until(repo, () => workOf(f, manager, work), ({ work: one }) => one.ended !== null, "the work ended");
    expect(view.work.ended?.as).toBe("stopped");
    await repo.does("comment", { by: "a-stranger", number: 1, text: "please go on" });
    await quiet(repo, () => repo.said(1));
    expect((await workOf(f, manager, work)).work.ended?.as).toBe("stopped");
    expect((await repo.said(1)).at(-1)).toMatch(/stop/iu);
  });
  it("flow:repo/stop-from-a-stranger-is-only-read", async () => {
    const f = await flow();
    const { repo, manager, work } = await opened(f);
    await repo.does("comment", { by: "a-stranger", number: 1, text: "@juno-test stop" });
    await quiet(repo, () => repo.said(1));
    expect((await workOf(f, manager, work)).work.ended).toBeNull();
  });
});

describe("when nothing happens, or things break", () => {
  it("flow:repo/quiet-past-its-date-it-says-once-what-it-waits-for", async () => {
    const f = await flow();
    const { repo, pull, manager, work } = await opened(f);
    // What it says on GitHub, and what it asks; not the morning list, which is a new one each day (coworker flows).
    const said = async () => (await repo.said(pull)).length + (await repo.said(1)).length + (await waiting(f.ama)).filter(({ need }) => need !== "know").length;
    const before = await said();
    await pass(f.ama, DAY + 60_000);
    await quiet(repo, () => repo.said(pull));
    const once = await said();
    expect(once).toBeGreaterThan(before);
    await pass(f.ama, DAY + 60_000);
    await quiet(repo, () => repo.said(pull));
    expect(await said()).toBe(once);
    expect((await workOf(f, manager, work)).work.next?.by).toBeGreaterThan(Date.now());
  });
  it("flow:repo/a-lost-box-and-its-snapshots-cost-time-only", async () => {
    const f = await flow();
    const { repo, pull, branch } = await opened(f);
    await repo.does("loseBoxes", { snapshots: true });
    await f.script(f.models.doer, [FIXES_IT("One more thing", `cat add.sh && ${commitOf("README.md", "# More")}`), pushes]);
    await repo.does("review", { by: f.ama.login, number: pull, state: "CHANGES_REQUESTED", text: "One more thing" });
    await until(repo, () => repo.does("file", { branch, path: "README.md" }), ({ text }) => text === "# More", "the push after the loss");
    expect((await repo.does("file", { branch, path: "add.sh" })).text).toBe("echo $(($1 + $2))");
  });
  it("flow:repo/uninstalled-it-says-so-asks-once-and-loses-nothing", async () => {
    const f = await flow();
    const { repo, pull } = await opened(f);
    await repo.does("uninstall");
    await repo.does("review", { by: f.ama.login, number: pull, state: "CHANGES_REQUESTED", text: "While you were away" });
    const { accounts } = await until(repo, () => f.ama.see("/settings/connectors"), ({ accounts: all }) => all[0]?.works === false, "the account says it does not work");
    expect(accounts[0]?.says).not.toBe("");
    const open = await until(repo, () => waiting(f.ama), (all) => all.some(({ question }) => /github/iu.test(question)), "Ama is asked");
    expect(open.filter(({ question }) => /github/iu.test(question))).toHaveLength(1);
    await repo.does("install");
    await pass(f.ama, 15 * 60_000);
    await until(repo, () => f.seen(f.models.doer), (seen) => seen.some(({ told }) => told.includes("While you were away")), "what came in meanwhile is dealt with");
  });
  it("flow:repo/no-container-free-it-waits-and-says-so", async () => {
    const f = await flow();
    const { repo, manager } = await ready(f);
    await world("/boxes", { down: true, repo: repo.name });
    try {
      await asks(f, repo);
      await until(repo, () => f.ama.see("/m/:manager/board", { manager }), (board) => board.cards.length === 1 && /container|box/iu.test(JSON.stringify(board.cards[0])), "the card says why it waits");
    } finally {
      await world("/boxes", { down: false, repo: repo.name });
    }
    await pass(f.ama, 10 * 60_000);
    await pulled(repo);
  });
});
