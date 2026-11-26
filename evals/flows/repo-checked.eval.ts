import { describe, expect, it } from "vitest";
import { flow, quiet, until } from "./kit.ts";
import { asks, opened, pulled, ready, waiting, workOf } from "./ready.ts";
import { builds, checksIt, fixes, opensIt, saysDone } from "./scripts.ts";

/** Journey 5: someone else checks, before a person is asked. */
const board = (f: Awaited<ReturnType<typeof flow>>, manager: string) => f.ama.see("/m/:manager/board", { manager });

describe("the check", () => {
  it("flow:check/is-a-fresh-conversation-that-cannot-write", async () => {
    const f = await flow();
    await opened(f);
    const [first] = await f.seen(f.models.reviewer);
    expect(first?.told).not.toContain("Understood: it subtracts.");
    expect(first?.told).not.toContain("It adds now.");
    expect(first?.told).toContain("echo $(($1 + $2))");
    expect(first?.told).toContain("sh add.sh 1 2 answers 3");
    expect(first?.tools).toEqual(expect.arrayContaining(["check", "read", "bash"]));
    for (const tool of first?.tools ?? []) expect(tool).not.toMatch(/^(?:write|edit|github_(?:push|merge|comment|open_pull_request))$/u);
  });

  it("flow:check/leaves-evidence-for-each-done-when-on-the-work-by-who-looked", async () => {
    const f = await flow();
    const { manager, work } = await opened(f);
    const view = await workOf(f, manager, work);
    const fixed = view.work.evidence.find(({ check }) => check === "fixed");
    expect(fixed).toMatchObject({ met: true, says: "Read it and ran the tests.", by: { agent: "reviewer" } });
    expect(view.work.doneWhen?.map(({ id }) => id)).toContain("fixed");
  });

  it("flow:check/sends-it-back-with-its-words-and-the-doer-does-it-again", async () => {
    const f = await flow();
    const { repo, manager } = await ready(f);
    await f.script(f.models.doer, [...saysDone, ...builds("echo 3"), ...builds(), ...opensIt()]);
    await f.script(f.models.reviewer, [...checksIt(false, "It always answers 3"), ...checksIt()]);
    await asks(f, repo);
    await pulled(repo);
    expect((await f.seen(f.models.doer)).some(({ told }) => told.includes("It always answers 3"))).toBe(true);
    const { cards } = await board(f, manager);
    const view = await workOf(f, manager, cards[0]?.work.id ?? "");
    expect(Object.values(view.work.sentBack)).toContain(1);
    expect(await waiting(f.ama)).toEqual([]);
  });

  it("flow:check/a-command-that-fails-never-reaches-the-reviewer-or-a-person", async () => {
    const f = await flow();
    const { repo } = await ready(f);
    await f.script(f.models.doer, [...saysDone, ...builds("echo 4", "Done, all tests pass."), ...builds(), ...opensIt()]);
    await asks(f, repo);
    const [pull] = await pulled(repo);
    expect((await repo.does("file", { branch: pull.pull.head.ref, path: "add.sh" })).text).toBe("echo $(($1 + $2))");
    expect(await f.seen(f.models.reviewer)).toHaveLength(1);
    // The doer is told which check failed, what was run and how it ended (work README), before anyone else looks.
    expect((await f.seen(f.models.doer)).some(({ told }) => /tests failed: sh test\.sh exited 1/u.test(told))).toBe(true);
  });

  it("flow:check/sent-back-twice-asks-the-person-who-answers-for-it", async () => {
    const f = await flow();
    const { repo } = await ready(f);
    await f.script(f.models.doer, [...saysDone, ...builds("echo 3 # 1"), ...builds("echo 3 # 2"), ...builds("echo 3 # 3"), ...opensIt()]);
    await f.script(f.models.reviewer, [{ tool: "check", times: "always", do: { call: "check", args: { evidence: [{ check: "fixed", met: false, says: "Always 3" }], says: "Always 3" } } }]);
    await asks(f, repo);
    const open = await until(repo, () => waiting(f.ama), (all) => all.length === 1, "Ama is asked");
    expect(open[0]).toMatchObject({ need: expect.stringMatching(/decide|review/u), question: expect.any(String), by: expect.any(Number) });
    expect(await repo.pulls()).toEqual([]);
    const said = (await f.seen(f.models.reviewer)).length;
    await quiet(repo, () => repo.pulls(), 3000);
    expect((await f.seen(f.models.reviewer)).length).toBe(said);
  });

  it("flow:check/a-doer-that-says-nothing-is-unanswered-and-does-not-pass", async () => {
    const f = await flow();
    const { repo, manager } = await ready(f);
    await f.script(f.models.doer, [...saysDone, { sees: "Make the change", start: true, do: { say: "All good!" } }]);
    await asks(f, repo);
    await until(repo, () => f.seen(f.models.doer), (seen) => seen.some(({ did }) => did === "All good!"), "the doer said something and reported nothing");
    await quiet(repo, () => repo.pulls(), 2500);
    expect(await repo.pulls()).toEqual([]);
    const { cards } = await board(f, manager);
    expect(cards[0]?.work.next).not.toBeNull();
  });

  it("flow:check/an-honest-no-ends-with-the-reason-told-where-it-was-asked", async () => {
    const f = await flow();
    const { repo, manager } = await ready(f);
    await f.script(f.models.doer, [{ tool: "report", start: true, do: { call: "report", args: { result: "no", says: "It is meant to subtract: the README says so.", evidence: [] } } }]);
    await asks(f, repo);
    const said = await until(repo, () => repo.said(1), (all) => all.some((text) => text.includes("meant to subtract")), "the reason is on the issue");
    expect(said.filter((text) => text.includes("meant to subtract"))).toHaveLength(1);
    const { cards } = await board(f, manager);
    expect((await workOf(f, manager, cards[0]?.work.id ?? "")).work.ended).toMatchObject({ as: "no", why: expect.stringContaining("meant to subtract") });
  });

  it("flow:check/only-its-own-branch-leaves-the-box", async () => {
    const f = await flow();
    const { repo } = await ready(f, {});
    await f.script(f.models.doer, [
      ...saysDone,
      { tool: "bash", sees: "Make the change", start: true, do: { call: "bash", args: { command: "mkdir -p .github/workflows && echo 'on: push' > .github/workflows/x.yml && printf '%s\\n' 'echo $(($1 + $2))' > add.sh && git add -A && git commit -qm both" } } },
      ...fixes.slice(3),
    ]);
    await asks(f, repo);
    await quiet(repo, () => repo.pulls(), 4000);
    for (const pull of await repo.pulls())
      expect((await repo.does("file", { branch: pull.pull.head.ref, path: ".github/workflows/x.yml" })).text).toBeNull();
    expect((await f.seen(f.models.doer)).some(({ told }) => /workflow/iu.test(told) && /refused|not|may/iu.test(told))).toBe(true);
  });
});
