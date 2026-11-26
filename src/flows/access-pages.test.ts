import { describe, expect, it } from "vitest";
import { eventually, json } from "../../test/flows.ts";
import { builder } from "../../test/roles.ts";
import { member, say, team } from "../../test/team.ts";

describe("which pages the server answers", () => {
  it("answers a Member the work pages, refuses the vault's, and follows what an Owner changes for them", async () => {
    const launch = await team("accesspages");
    const { owner, workspace, base } = launch;
    const bo = await member(launch, "accesspages-bo@example.test", "Bo");
    const status = async (path: string) => (await bo.send("GET", path)).status;
    const set = (key: string, value: "off" | null) =>
      owner.send("PUT", `${workspace}/permissions`, { person: "email:accesspages-bo@example.test", scope: "action", key, value });

    expect(await Promise.all([base, `${base}/pages`, `${base}/events`, `${base}/tasks/DT-1`, `${base}/chat`].map(status))).toEqual([
      200, 200, 200, 404, 200,
    ]);
    expect(await Promise.all([`${workspace}/environments`, `${workspace}/usage`, `${workspace}/permissions`].map(status))).toEqual([
      403, 403, 403,
    ]);
    expect(await json(await bo.send("GET", `${workspace}/access`))).toEqual({ role: "member", own: { categories: {}, actions: {} } });

    expect((await set("mission.read", "off")).status).toBe(200);
    expect(await Promise.all([`${base}/pages`, base, `${base}/events`].map(status))).toEqual([403, 200, 200]);
    expect(await json(await bo.send("GET", `${workspace}/access`))).toEqual({
      role: "member",
      own: { categories: {}, actions: { "mission.read": "off" } },
    });

    expect((await set("mission.read", null)).status).toBe(200);
    expect((await set("board.read", "off")).status).toBe(200);
    expect(await Promise.all([base, `${base}/chat`, `${base}/pages`, `${base}/policy`].map(status))).toEqual([403, 403, 403, 403]);
    expect(await status(`${workspace}/inbox`)).toBe(200);
  });

  it("tells in search, Agents and GitHub only what the person may open", async () => {
    const launch = await team("accesssearch");
    const { owner, workspace } = launch;
    const bo = await member(launch, "accesssearch-bo@example.test", "Bo");
    await say(launch, "add a task: Zebra changelog", "t1");
    expect((await owner.send("PUT", `${workspace}/environments`, { name: "app", setup: "TOKEN=vault:github pnpm i" })).ok).toBe(true);
    const found = async () => (await json<{ hits: readonly unknown[] }>(await bo.send("GET", `${workspace}/search?q=zebra`))).hits.length;
    const set = (key: string) =>
      owner.send("PUT", `${workspace}/permissions`, { person: "email:accesssearch-bo@example.test", scope: "action", key, value: "off" });

    await eventually(found, (count) => count === 1);
    expect((await bo.send("GET", `${workspace}/github`)).status).toBe(200);
    const agents = await json<{ environments: readonly unknown[] }>(await bo.send("GET", `${workspace}/agents`));
    expect(agents.environments).toEqual([{ id: expect.any(String), name: "app" }]);

    expect((await set("board.read")).status).toBe(200);
    expect(await found()).toBe(0);
    expect((await set("policy.read")).status).toBe(200);
    expect((await bo.send("GET", `${workspace}/github`)).status).toBe(403);
  });

  it("answers a Builder with the build pages and keeps the workspace's settings to Owners", async () => {
    const launch = await team("accessbuilder");
    const bo = await builder(launch, "accessbuilder-bo@example.test", "Bo");
    const status = async (path: string) => (await bo.send("GET", path)).status;
    expect(
      await Promise.all([`${launch.workspace}/environments`, `${launch.workspace}/agents`, `${launch.base}/policy`].map(status)),
    ).toEqual([200, 200, 200]);
    expect(
      await Promise.all([`${launch.workspace}/usage`, `${launch.workspace}/billing`, `${launch.workspace}/audit`].map(status)),
    ).toEqual([403, 403, 403]);
  });
});
