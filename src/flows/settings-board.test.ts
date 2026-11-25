import { describe, expect, it } from "vitest";

import { eventually } from "../../test/flows.ts";
import { lines, press, saidBy, task } from "../../test/settings.ts";
import { board, member, say, team } from "../../test/team.ts";

describe("a manager's board settings", () => {
  it("changes lanes, fields and the first view with buttons, and says why when it cannot", async () => {
    const launch = await team("boardset");
    expect(await press(launch, "lane.create", { name: "Blocked", meaning: "Waiting on someone", limit: 3 })).toMatchObject({
      _tag: "Done",
      value: { ok: true, value: { lane: "blocked" } },
    });
    expect((await press(launch, "lane.create", { name: "blocked" })).value?.message).toBe("There is already a lane blocked");
    expect((await press(launch, "lane.update", { lane: "Blocked", needsApproval: true, limit: null, name: "Stuck" })).value?.ok).toBe(true);
    expect((await press(launch, "lane.update", { lane: "stuck", limit: 0 })).value?.message).toContain("whole number");
    expect((await board(launch)).lanes.at(-1)).toEqual({
      id: "blocked",
      name: "Stuck",
      meaning: "Waiting on someone",
      needsApproval: true,
    });
    expect((await press(launch, "lane.reorder", { order: ["blocked", "todo", "doing", "review", "done"] })).value?.ok).toBe(true);
    expect((await press(launch, "lane.reorder", { order: ["todo"] })).value?.message).toBe("Name every lane once, by its id");
    expect((await board(launch)).lanes.map(({ id }) => id)).toEqual(["blocked", "todo", "doing", "review", "done"]);

    await press(launch, "task.create", { title: "Write the docs", lane: "todo" });
    expect((await press(launch, "lane.delete", { lane: "todo" })).value?.message).toBe("To do still has tasks. Move them first");
    expect((await press(launch, "lane.delete", { lane: "blocked" })).value?.ok).toBe(true);

    expect(
      (await press(launch, "field.create", { label: "Area", type: "select", options: [{ value: "docs", tone: "green" }, "api"] })).value
        ?.value,
    ).toEqual({ field: "area", label: "Area" });
    expect((await press(launch, "field.create", { label: "Area", type: "text" })).value?.message).toBe("There is already a field Area");
    expect((await press(launch, "field.create", { label: "Bad", type: "select" })).value?.ok).toBe(false);
    expect((await press(launch, "field.create", { label: "Due", type: "date" })).value?.ok).toBe(true);
    expect((await press(launch, "view.default", { view: "console" })).value?.ok).toBe(true);
    expect((await press(launch, "view.default", { view: "wall" })).value?.ok).toBe(false);

    expect(
      (await press(launch, "task.values", { task: "DT-1", values: { area: "docs", due: "2026-12-01", priority: "high" } })).value?.ok,
    ).toBe(true);
    expect((await press(launch, "task.values", { task: "DT-1", values: { area: "ui" } })).value?.message).toContain(
      "Area is one of docs, api",
    );
    expect((await press(launch, "task.values", { task: "DT-1", values: { due: "tomorrow" } })).value?.message).toContain("YYYY-MM-DD");
    expect((await press(launch, "task.values", { task: "DT-1", values: { nope: 1 } })).value?.message).toBe("There is no field nope");
    expect((await press(launch, "task.values", { task: "DT-9", values: { area: "docs" } })).value?.message).toBe("There is no task DT-9");
    expect((await board(launch)).tasks[0]?.values).toEqual({ area: "docs", due: "2026-12-01", priority: "high" });
    expect((await press(launch, "field.update", { field: "area", options: ["api"] })).value?.message).toBe(
      "DT-1 holds docs, which is not among the options",
    );
    expect((await press(launch, "task.values", { task: "DT-1", values: { area: null } })).value?.ok).toBe(true);
    expect((await press(launch, "field.update", { field: "area", label: "Where", options: ["api"] })).value?.ok).toBe(true);
    await press(launch, "task.values", { task: "DT-1", values: { area: "api" } });
    expect((await press(launch, "field.delete", { field: "area" })).value?.ok).toBe(true);
    const after = await board(launch);
    expect(after).toMatchObject({ defaultView: "console", tasks: [{ values: { due: "2026-12-01", priority: "high" } }] });
    expect(after.fields.map(({ key }) => key)).toEqual(["priority", "due"]);
  });

  it("leaves the same line whether a person pressed it or the manager used its tool", async () => {
    const launch = await team("boardparity");
    await press(launch, "lane.create", { name: "Blocked" });
    await say(launch, "add a lane: Parked", "lane-1");
    await eventually(async () => (await board(launch)).lanes.some(({ id }) => id === "parked"), Boolean);
    const created = (await lines(launch, "&category=board")).filter(({ action }) => action === "lane.create");
    expect(created.map(({ by, sentence, permission }) => [by.kind, sentence, permission])).toEqual([
      ["manager", "Launch added the lane Parked", "on"],
      ["person", "Ama added the lane Blocked", "on"],
    ]);
    await press(launch, "task.create", { title: "Docs" });
    await say(launch, "set DT-1 priority to high", "v-1");
    await say(launch, "comment on DT-1: Mind the row limit", "c-1");
    const detail = await eventually(
      () => task(launch, "DT-1"),
      (found) => found.comments.length === 1 && found.task.values["priority"] === "high",
    );
    expect(detail.comments[0]).toMatchObject({ by: { kind: "manager", name: "Launch" }, text: "Mind the row limit" });
    expect(detail.history.map(({ sentence }) => sentence)).toEqual(["Ama added the task Docs", "Launch set fields on DT-1"]);
  });
});

describe("a task's comments and history", () => {
  it("keeps what people said and what was done, as the audit log's own sentences", async () => {
    const launch = await team("taskpage");
    const bo = await member(launch, "taskpage-bo@example.test", "Bo");
    await press(launch, "task.create", { title: "Document streaming export" });
    await press(launch, "task.move", { task: "DT-1", lane: "doing" });
    await press(launch, "task.comment", { task: "dt-1", text: "If we ship with a row limit, the docs must say so." }, bo);
    expect((await press(launch, "task.comment", { task: "DT-1", text: "  " })).value?.ok).toBe(false);
    expect((await press(launch, "task.owner", { task: "DT-1", owner: "email:taskpage-bo@example.test" })).value?.ok).toBe(true);
    expect((await press(launch, "task.owner", { task: "DT-1", owner: "" })).value?.ok).toBe(false);

    const detail = await task(launch, "DT-1");
    expect(detail.task).toMatchObject({ id: "DT-1", lane: "doing" });
    expect(detail.owner).toBe("email:taskpage-bo@example.test");
    expect(detail.comments).toEqual([
      expect.objectContaining({
        id: "c1",
        by: expect.objectContaining({ name: "Bo", kind: "person" }),
        text: "If we ship with a row limit, the docs must say so.",
      }),
    ]);
    expect(detail.history.map(({ sentence }) => sentence)).toEqual([
      "Ama added the task Document streaming export",
      "Ama moved DT-1 to doing",
      "Ama made email:taskpage-bo@example.test the owner of DT-1",
    ]);
    const audited = await saidBy(launch);
    for (const entry of detail.history) expect(audited).toContain(entry.sentence);

    expect((await launch.owner.send("GET", `${launch.base}/tasks/DT-9`)).status).toBe(404);
    expect((await bo.send("GET", `${launch.base}/tasks/DT-1`)).status).toBe(200);
    const other = await team("taskpage-other");
    expect((await other.owner.send("GET", `${launch.base}/tasks/DT-1`)).status).toBe(404);
    expect((await other.owner.send("GET", `${other.workspace}/managers/${launch.manager.managerId}/tasks/DT-1`)).status).toBe(404);
  });

  it("lets a Member comment and set values, and keeps a Member out of the board's settings until an Owner allows it", async () => {
    const launch = await team("taskroles");
    const bo = await member(launch, "taskroles-bo@example.test", "Bo");
    await press(launch, "task.create", { title: "Docs" });
    expect((await press(launch, "task.comment", { task: "DT-1", text: "Looks good" }, bo))._tag).toBe("Done");
    expect((await press(launch, "lane.create", { name: "Parked" }, bo))._tag).toBe("Refused");
    expect((await lines(launch)).find(({ action }) => action === "lane.create")).toMatchObject({ outcome: "refused", by: { name: "Bo" } });
    await launch.owner.send("PUT", `${launch.workspace}/permissions`, {
      person: "email:taskroles-bo@example.test",
      scope: "action",
      key: "lane.create",
      value: "on",
    });
    expect((await press(launch, "lane.create", { name: "Parked" }, bo))._tag).toBe("Done");
    expect((await press(launch, "lane.delete", { lane: "parked" }, bo))._tag).toBe("Refused");
  });
});
