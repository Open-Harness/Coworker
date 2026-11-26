import { describe, expect, it } from "vitest";
import { DAY, flow, pass, quiet, until } from "./kit.ts";
import { asks, opened, pulled, ready, waiting, workOf } from "./ready.ts";
import { takes } from "./scripts.ts";

/** Managers under managers, templates, pausing and retiring. */
describe("templates", () => {
  it("flow:tree/only-the-repo-is-needed-and-the-rest-is-found", async () => {
    const f = await flow();
    const repo = await f.repo({ "package.json": '{"name":"x","scripts":{"test":"sh test.sh"}}', "pnpm-lock.yaml": "lockfileVersion: 9\n", "test.sh": "true\n", "AGENTS.md": "Be brief.\n" });
    const tried = await f.ama.write("/templates/:template/try", { place: repo.name }, { template: "repo" });
    expect(tried.found).toMatchObject({ install: expect.stringMatching(/pnpm install/u), test: expect.stringMatching(/test/u), took: { read: expect.any(Number), ran: expect.any(Number) } });
    expect(tried.blanks.every(({ best }) => best !== null)).toBe(true);
    const manager = await f.ama.done("manager.make", { template: "repo", answers: { repo: repo.name } });
    expect((await f.ama.see("/m/:manager/playbook?version", { manager })).problems).toEqual([]);
    expect((await repo.look()).calls.every(({ method }) => method === "GET")).toBe(true);
  });
  it("flow:tree/a-fifth-manager-is-one-press-and-neither-has-the-other's", async () => {
    const f = await flow();
    const { repo } = await ready(f);
    const made = await Promise.all(["B", "C", "D", "E"].map((name) => f.manager(repo, { name })));
    expect(new Set(made).size).toBe(4);
    const { templates } = await f.ama.see("/templates");
    expect(templates.find(({ id }) => id === "repo")?.managers).toHaveLength(5);
  });
  it("flow:tree/saved-as-a-template-it-names-no-place-person-model-or-secret", async () => {
    const f = await flow();
    const { repo, manager } = await ready(f);
    await f.ama.done("template.save", { manager, name: "Our way", about: "How we fix things" });
    const { templates } = await f.ama.see("/templates");
    const saved = templates.find(({ whose }) => whose === "this workspace");
    expect(saved).toMatchObject({ name: "Our way" });
    const fill = await f.ama.see("/templates/:template", { template: saved?.id ?? "" });
    expect(JSON.stringify([saved, fill.blanks.map(({ picks: _picks, ...blank }) => blank)])).not.toMatch(new RegExp(`${repo.name}|${f.models.doer}|${f.connection}`, "u"));
    const place = fill.blanks.find(({ is }) => is.a === "place");
    const next = await f.ama.done("manager.make", { template: saved?.id ?? "", answers: { [place?.id ?? "place"]: repo.name } });
    expect((await f.ama.see("/m/:manager/playbook?version", { manager: next })).problems).toEqual([]);
  });
});

describe("the tree", () => {
  it("flow:tree/a-manager-below-has-a-part-and-never-more", async () => {
    const f = await flow();
    const { repo, manager } = await ready(f, { perDay: "10" });
    const answers = { repo: repo.name, name: "Docs", install: "true", test: "true" };
    const below = await f.ama.act("manager.make", { template: "repo", above: manager, answers: { ...answers, perDay: "11" } });
    expect(below).toMatchObject({ _tag: expect.stringMatching(/Problems|Refused/u) });
    const made = await f.ama.done("manager.make", { template: "repo", above: manager, answers: { ...answers, perDay: "4" } });
    expect((await f.ama.see("/tree")).rows.find(({ id }) => id === made)).toMatchObject({ above: manager, limit: 4 });
  });
  it("flow:tree/what-is-taken-back-above-is-gone-below", async () => {
    const f = await flow();
    const { repo, manager } = await ready(f);
    const below = await f.ama.done("manager.make", { template: "repo", above: manager, answers: { repo: repo.name, name: "Docs", install: "true", test: "true" } });
    const { files, version } = await f.ama.see("/m/:manager/playbook?version", { manager });
    const less = Object.fromEntries(Object.entries(files).map(([path, body]) => [path, body.replaceAll(/github\.push: "?on"?/gu, "github.push: off")]));
    await f.ama.done("version.save", { manager, version, files: less });
    const view = await f.ama.see("/m/:manager/playbook?version", { manager: below });
    expect(view.problems.some(({ says }) => /github\.push/u.test(says)) || !/github\.push: "?on"?/u.test(view.files["reach.yaml"] ?? "")).toBe(true);
  });
  it("flow:tree/paused-it-takes-nothing-on-and-keeps-what-came-in", async () => {
    const f = await flow();
    const { repo, manager } = await ready(f);
    await f.ama.done("manager.pause", { manager });
    await asks(f, repo);
    const { rows } = await until(repo, () => f.ama.see("/m/:manager/intake?from&state&before", { manager }), ({ rows: all }) => all.length === 1, "it is kept");
    expect(rows[0]?.decision).toMatchObject({ _tag: "Left", why: expect.stringMatching(/paused/iu) });
    await quiet(repo, () => repo.pulls());
    expect(await f.seen(f.models.doer)).toEqual([]);
    await f.ama.done("manager.start", { manager });
    expect(await pulled(repo)).toHaveLength(1);
  });
  it("flow:tree/retired-nothing-is-left-without-one-who-answers", async () => {
    const f = await flow();
    const { repo, manager, work } = await opened(f);
    const other = await f.manager(repo, { name: "Other" });
    await f.ama.done("manager.retire", { manager, handTo: other });
    const { cards } = await f.ama.see("/m/:manager/board", { manager: other });
    expect(cards).toHaveLength(1);
    expect((await f.ama.see("/shell")).tree.map(({ id }) => id)).toEqual([other]);
    expect((await f.ama.see("/m/:manager/work/:work", { manager, work })).work.ended).toMatchObject({ as: "handed over" });
    await f.script(f.models.judge, [takes(other)]);
    await repo.does("review", { by: f.ama.login, number: (await repo.pulls())[0].number, state: "COMMENTED", text: "Still there?" });
    await until(repo, () => f.seen(f.models.doer), (seen) => seen.some(({ told }) => told.includes("Still there?")), "the one it was handed to heard");
  });
  it("flow:tree/a-person-moves-adds-stops-and-opens-again", async () => {
    const f = await flow();
    const { manager } = await ready(f);
    await f.script(f.models.doer, []);
    const work = await f.ama.done("work.add", { manager, kind: "bug", title: "By hand", about: "Please" });
    await f.ama.done("work.stop", { manager, work, why: "Not now" });
    expect((await workOf(f, manager, work)).work.ended).toMatchObject({ as: "stopped", why: "Not now" });
    await f.ama.done("work.open_again", { manager, work, why: "Now" });
    expect((await workOf(f, manager, work)).work.ended).toBeNull();
    await f.ama.done("work.move", { manager, work, step: "build" });
    const view = await workOf(f, manager, work);
    expect(view.work.step).toBe("build");
    expect(view.activity.some(({ who, text }) => who === "Ama" && /build/iu.test(text))).toBe(true);
  });
});

describe("how good", () => {
  it("flow:good/a-measure-that-cannot-be-read-yet-says-when", async () => {
    const f = await flow();
    const { manager } = await opened(f);
    const { standing } = await f.ama.see("/m/:manager", { manager });
    expect(standing).toMatchObject({ _tag: "NotYet", until: expect.any(Number) });
  });
  it("flow:good/each-week-the-weakest-part-gets-one-change-tried-beside-what-is-there", async () => {
    const f = await flow();
    const { repo, manager } = await ready(f);
    for (const title of ["One", "Two", "Three"]) {
      await repo.does("issue", { by: "a-stranger", title, body: "Please", labels: [] });
      const { rows } = await until(repo, () => f.ama.see("/m/:manager/intake?from&state&before", { manager }), (view) => view.rows.some(({ item }) => item.title === title), "it is there");
      await f.ama.done("intake.correct", { manager, item: rows.find(({ item }) => item.title === title)?.item.id ?? "", should: "left" });
    }
    // The weakest part is the judge's. Juno is asked for one change to it (coworker README) and proposes it with `try.change`.
    const { files } = await f.ama.see("/m/:manager/playbook?version", { manager });
    const was = (files["agents/judge.md"] ?? "").split("\n---\n\n")[1]?.trimEnd() ?? "";
    const part = JSON.stringify({ line: "agents/judge/told", was, becomes: `${was} Say no to a wish.` });
    await f.ama.done("models.default", { connection: f.connection, model: f.models.juno, thinking: "low" });
    await f.script(f.models.juno, [{ tool: "act", start: true, do: { call: "act", args: { doing: "try.change", values: { manager, part } } } }]);
    const asked = (await f.seen(f.models.judge)).length;
    await pass(f.ama, 7 * DAY);
    const { rail } = await until(null, () => f.ama.see("/m/:manager", { manager }), (view) => view.rail.some(({ tone }) => tone === "proposes"), "it proposes something", 40_000);
    expect(rail.filter(({ tone }) => tone === "proposes")).toHaveLength(1);
    expect((await f.seen(f.models.judge)).length).toBeGreaterThan(asked);
    expect((await f.ama.see("/m/:manager/playbook?version", { manager })).version).toBe(1);
    expect(await waiting(f.ama)).not.toEqual([]);
  });
  it("flow:good/a-correction-becomes-a-line-to-accept", async () => {
    const f = await flow();
    const { repo, manager, pull } = await opened(f);
    await f.script(f.models.doer, [
      { tool: "note", sees: "never name a variable x", start: true, do: { call: "note", args: { says: "Never name a variable x in this repo." } } },
    ]);
    await repo.does("review", { by: f.ama.login, number: pull, state: "CHANGES_REQUESTED", text: "We never name a variable x" });
    const view = await until(repo, () => f.ama.see("/m/:manager/playbook?version", { manager }), ({ comments }) => comments.some(({ became }) => became._tag === "Change"), "a line is proposed", 30_000);
    const change = view.comments.find(({ became }) => became._tag === "Change");
    expect(JSON.stringify(change)).toContain("Never name a variable x");
    await f.ama.done("suggestion.accept", { manager, comment: change?.id ?? "" });
    const now = await f.ama.see("/m/:manager/playbook?version", { manager });
    expect(now.version).toBe(2);
    expect(JSON.stringify(now.files)).toContain("Never name a variable x");
  });
});
