import { describe, expect, it } from "vitest";
import type { PageView } from "~/modules/manager/types.ts";
import type { SearchHit } from "~/modules/search/types.ts";
import { eventually, json } from "../../test/flows.ts";
import { member, say, team, type Team } from "../../test/team.ts";

const find = async (browser: Team["owner"], { workspace }: Team, q: string): Promise<readonly SearchHit[]> =>
  (await json<{ hits: readonly SearchHit[] }>(await browser.send("GET", `${workspace}/search?q=${encodeURIComponent(q)}`))).hits;

describe("search over more than pages and tasks", () => {
  it("finds managers and people, and shows a person only what they may read", async () => {
    const launch = await team("searchkinds");
    const bo = await member(launch, "searchkinds-bo@example.test", "Bo Larsen");
    await say(launch, "add a task: Ship the changelog", "t1");
    await eventually(
      async () => find(launch.owner, launch, "changelog"),
      (hits) => hits.some(({ kind }) => kind === "task"),
    );

    expect((await find(bo, launch, "launch")).map(({ kind }) => kind)).toContain("manager");
    expect(await find(bo, launch, "larsen")).toEqual([
      expect.objectContaining({ kind: "person", id: "email:searchkinds-bo@example.test" }),
    ]);
    expect((await find(bo, launch, "changelog")).map(({ kind }) => kind)).toEqual(["task"]);

    // An Owner takes reading tasks from Bo: the task is no longer found by him, but the manager and the person are.
    const off = await launch.owner.send("PUT", `${launch.workspace}/permissions`, {
      person: "email:searchkinds-bo@example.test",
      scope: "action",
      key: "task.read",
      value: "off",
    });
    expect(off.status).toBe(200);
    expect(await find(bo, launch, "changelog")).toEqual([]);
    expect((await find(launch.owner, launch, "changelog")).map(({ kind }) => kind)).toEqual(["task"]);
    expect((await find(bo, launch, "larsen")).map(({ kind }) => kind)).toEqual(["person"]);
  });
});

describe("two people editing a page", () => {
  it("refuses a save that began from an older version, and tells who changed it", async () => {
    const launch = await team("pagebase");
    const bo = await member(launch, "pagebase-bo@example.test", "Bo Larsen");
    const pages = async () => (await json<{ pages: readonly PageView[] }>(await bo.send("GET", `${launch.base}/pages`))).pages;
    const [mission] = await pages();
    if (mission === undefined) throw new Error("no mission");
    const save = (body: string, base: number) =>
      launch.owner.send("POST", `${launch.base}/actions/mission.update`, { input: { body, base }, requestId: `r-${body}` });

    await new Promise((resolve) => setTimeout(resolve, 5));
    expect((await save("First", mission.updatedAt)).status).toBe(200);
    const stale = await save("Second", mission.updatedAt);
    // Like every handler that cannot do it, the page says so as the action's value.
    expect(await json<{ _tag: string; value: { ok: boolean; message: string } }>(stale)).toMatchObject({
      _tag: "Done",
      value: { ok: false, message: expect.stringMatching(/Ama changed .* after you opened it/u) },
    });
    const [kept] = await pages();
    expect(kept).toMatchObject({ body: "First", updatedBy: { name: "Ama" } });

    const answer = await json<{ can: { mission: string; page: string } }>(await bo.send("GET", `${launch.base}/pages`));
    expect(answer.can).toEqual({ mission: "on", page: "on" });
  });
});
