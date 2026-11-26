import { describe, expect, it } from "vitest";
import { CATALOGUE, createActions } from "~/modules/actions/service.ts";
import { offered } from "~/modules/manager/testing.ts";
import type { PageView } from "~/modules/manager/types.ts";
import type { CreateManagerResult, ManagerEntry } from "~/modules/workspace/types.ts";
import { placements } from "~/modules/workspaces/testing.ts";
import type { SearchHit } from "~/modules/search/types.ts";
import { eventually, json, signUp } from "../../test/flows.ts";
import { press } from "../../test/settings.ts";
import { board, chatLog, say, team } from "../../test/team.ts";

const book = Object.values(import.meta.glob("/docs/old/actions.md", { query: "?raw", import: "default", eager: true }))[0] as string;
const bookIds = [...book.matchAll(/^\| `([a-z]+\.[a-z]+)` \|/gmu)].map(([, id]) => id ?? "");

describe("the manager", () => {
  it("flw:manager/create", async () => {
    const launch = await team("acme");
    expect(launch.manager).toMatchObject({ name: "Launch", slug: "launch", address: "launch.acme@co-worker.tech", region: "eu" });
    expect(placements.get(launch.manager.objectId)).toBe("eu");
    const view = await board(launch);
    expect(view.lanes.map(({ name }) => name)).toEqual(["To do", "Doing", "Review", "Done"]);
    expect(view).toMatchObject({ defaultView: "kanban", tasks: [] });
    const { pages } = await json<{ pages: readonly PageView[] }>(await launch.owner.send("GET", `${launch.base}/pages`));
    expect(pages).toEqual([expect.objectContaining({ id: "mission", parent: null, title: "Launch" })]);
    expect(pages[0]?.body).toContain("# Launch");
    const listed = await json<{ managers: readonly ManagerEntry[] }>(await launch.owner.send("GET", launch.base.replace(/\/[^/]+$/u, "")));
    expect(listed.managers.map(({ managerId }) => managerId)).toEqual([launch.manager.managerId]);
    const workspace = launch.base.replace(/\/managers\/.*$/u, "");
    const again = await launch.owner.send("POST", `${workspace}/managers`, { name: "Launch", template: "incident" });
    expect(again.status).toBe(409);
    const incident = await json<CreateManagerResult>(
      await launch.owner.send("POST", `${workspace}/managers`, { name: "On call", template: "incident" }),
    );
    expect(incident).toMatchObject({ _tag: "Created", manager: { address: "on-call.acme@co-worker.tech", template: "incident" } });
  });

  it("acc:manager/tools-are-actions", async () => {
    const launch = await team("tools");
    offered.names = [];
    expect((await say(launch, "Hello", "hello-1")).status).toBe(202);
    await eventually(
      () => chatLog(launch),
      (lines) => lines.some(({ role }) => role === "manager"),
    );
    // One tool per built action, named by its id with `.` written `_`; an action set to off is not offered (model.md).
    const asIds = offered.names.map((name) => name.replaceAll("_", "."));
    const actions = createActions({
      sources: { manager: () => ({ categories: {}, actions: {} }), person: () => undefined },
      handlers: {},
      audit: () => undefined,
      clock: { now: () => 0 },
    });
    const off = bookIds.filter((id) => actions.check({ kind: "manager", id: launch.manager.managerId, name: "Launch" }, id) === "off");
    expect(off.sort()).toEqual(["billing.update", "connection.create", "manager.create", "manager.delete", "member.invite", "vault.write"]);
    expect(asIds.filter((id) => off.includes(id))).toEqual([]);
    // Built or not is what the Owner's button of the same id says: with no input it does little, but a handler answers.
    const unbuilt: string[] = [];
    for (const id of bookIds) {
      const pressed = await press(launch, id, {});
      if (pressed._tag === "Failed") expect(pressed.message).toContain("is not available yet");
      if (pressed._tag === "Failed") unbuilt.push(id);
    }
    expect(unbuilt.length).toBeLessThan(bookIds.length);
    expect(asIds.filter((id) => unbuilt.includes(id))).toEqual([]);
    expect([...new Set([...asIds, ...off, ...unbuilt])].sort()).toEqual([...bookIds].sort());
    expect(CATALOGUE.map(({ id }) => id).sort()).toEqual([...bookIds].sort());
    expect(new Set(offered.names).size).toBe(offered.names.length);
  });

  it("flw:manager/chat-task", async () => {
    const launch = await team("chat");
    expect((await say(launch, "add a task: Write the launch post", "post-1")).status).toBe(202);
    expect((await say(launch, "add a task: Write the launch post", "post-1")).status).toBe(202);
    const view = await eventually(
      () => board(launch),
      ({ tasks }) => tasks.length > 0,
    );
    expect(view.tasks).toEqual([
      expect.objectContaining({
        id: "DT-1",
        title: "Write the launch post",
        lane: "todo",
        createdBy: expect.objectContaining({ kind: "manager", name: "Launch" }),
      }),
    ]);
    const lines = await eventually(
      () => chatLog(launch),
      (all) => all.filter(({ role }) => role === "manager").length >= 2,
    );
    expect(lines[0]).toMatchObject({ role: "person", text: "add a task: Write the launch post", author: { name: "Ama" } });
    expect(lines.filter(({ role }) => role === "action")).toEqual([
      expect.objectContaining({ text: 'task_create: {"task":"DT-1","title":"Write the launch post","lane":"todo"}' }),
    ]);
    expect(lines.filter(({ role }) => role === "person")).toHaveLength(1);
  });

  it("flw:pages/mission", async () => {
    const launch = await team("pages");
    await say(launch, "update the mission: # Launch\n\nShip v2.3 to every customer by Friday.", "mission-1");
    await say(launch, "add a page Launch checklist: Freeze the branch, run the tests, ship.", "page-1");
    const pages = async (base: string) =>
      (await json<{ pages: readonly PageView[] }>(await launch.owner.send("GET", `${base}/pages`))).pages;
    const written = await eventually(
      () => pages(launch.base),
      (all) => all.length === 2,
    );
    expect(written).toEqual([
      expect.objectContaining({
        id: "mission",
        body: "# Launch\n\nShip v2.3 to every customer by Friday.",
        updatedBy: expect.objectContaining({ kind: "manager" }),
      }),
      expect.objectContaining({ parent: "mission", title: "Launch checklist", body: "Freeze the branch, run the tests, ship." }),
    ]);
    const docs = await json<CreateManagerResult>(
      await launch.owner.send("POST", `${launch.workspace}/managers`, { name: "Docs", template: "kanban" }),
    );
    if (docs._tag !== "Created") throw new Error(docs._tag);
    const docsBase = `${launch.workspace}/managers/${docs.manager.managerId}`;
    await launch.owner.send("POST", `${docsBase}/chat`, {
      text: "add a page Checklist template: A checklist every launch copies.",
      requestId: "docs-1",
    });
    await eventually(
      () => pages(docsBase),
      (all) => all.length === 2,
    );
    const find = async (q: string) =>
      (await json<{ hits: readonly SearchHit[] }>(await launch.owner.send("GET", `${launch.workspace}/search?q=${encodeURIComponent(q)}`)))
        .hits;
    expect((await find("friday")).map(({ id, managerId }) => ({ id, managerId }))).toEqual([
      { id: "mission", managerId: launch.manager.managerId },
    ]);
    const checklists = await find("checklist");
    expect(checklists.map(({ title, managerId }) => ({ title, managerId })).sort((a, b) => a.title.localeCompare(b.title))).toEqual([
      { title: "Checklist template", managerId: docs.manager.managerId },
      { title: "Launch checklist", managerId: launch.manager.managerId },
    ]);
    const stranger = await signUp("stranger@example.test", "Stranger");
    expect((await stranger.send("GET", `${launch.workspace}/search?q=checklist`)).status).toBe(404);
  });
});
