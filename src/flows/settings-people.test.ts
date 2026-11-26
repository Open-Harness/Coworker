import { describe, expect, it } from "vitest";
import { worldClock } from "~/modules/clock/testing.ts";
import { outbox } from "~/modules/mail/testing.ts";
import type { NotificationView, PersonChange, ProfileView } from "~/modules/settings/types.ts";
import type { AuditEntry, CreateManagerResult } from "~/modules/workspace/types.ts";
import { eventually, json } from "../../test/flows.ts";
import { board, chatLog, inbox, member, say, team, type Team } from "../../test/team.ts";

const entries = async ({ owner, workspace }: Team, query = "") =>
  json<{ entries: readonly AuditEntry[]; next?: string }>(await owner.send("GET", `${workspace}/audit${query}`));
const sentences = async (launch: Team, query = ""): Promise<readonly string[]> =>
  (await entries(launch, query)).entries.map(({ sentence }) => sentence);

describe("roles and what people may do", () => {
  it("lets an Owner change one action for one person, and the same check holds for the button", async () => {
    const launch = await team("rolechange");
    const { owner, workspace } = launch;
    const bo = await member(launch, "rolechange-bo@example.test", "Bo");
    const create = () => bo.send("POST", `${workspace}/managers`, { name: "Bo's desk", template: "kanban" });
    expect((await create()).status).toBe(403);

    const set = (value: string | null, person = "email:rolechange-bo@example.test", key = "manager.create") =>
      owner.send("PUT", `${workspace}/permissions`, { person, scope: "action", key, value });
    expect((await set("on")).status).toBe(200);
    const made = await json<CreateManagerResult>(await create());
    expect(made._tag).toBe("Created");

    const listed = await json<{ people: readonly { person: string; preset: string; changes: readonly PersonChange[] }[] }>(
      await owner.send("GET", `${workspace}/permissions`),
    );
    expect(listed.people.find(({ person }) => person === "email:rolechange-bo@example.test")).toMatchObject({
      preset: "member",
      changes: [{ scope: "action", key: "manager.create", value: "on", byName: "Ama" }],
    });
    const mine = await json<{ mine: { preset: string; own: { actions: Record<string, string> } } }>(
      await bo.send("GET", `${workspace}/roles`),
    );
    expect(mine.mine).toEqual({ preset: "member", own: { categories: {}, actions: { "manager.create": "on" } } });

    expect((await set(null)).status).toBe(200);
    expect((await create()).status).toBe(403);
    expect(await sentences(launch, "?category=settings")).toEqual([
      "Ama removed the change to “Create another manager” for rolechange-bo@example.test",
      "Ama turned “Create another manager” on for rolechange-bo@example.test",
    ]);
  });

  it("turns a whole category off for a person, and refuses what a preset cannot make it", async () => {
    const launch = await team("rolecategory");
    const { owner, workspace } = launch;
    const bo = await member(launch, "rolecategory-bo@example.test", "Bo");
    const person = "email:rolecategory-bo@example.test";
    const act = (id: string, input: object, requestId: string) => bo.send("POST", `${launch.base}/actions/${id}`, { input, requestId });
    expect((await act("task.create", { title: "Mine" }, "t1")).status).toBe(200);
    expect((await owner.send("PUT", `${workspace}/permissions`, { person, scope: "category", key: "tasks", value: "off" })).status).toBe(
      200,
    );
    expect((await act("task.create", { title: "Again" }, "t2")).status).toBe(403);
    expect((await owner.send("PUT", `${workspace}/permissions`, { person, scope: "category", key: "tasks", value: null })).status).toBe(
      200,
    );
    expect((await act("task.create", { title: "Again" }, "t3")).status).toBe(200);
    expect(
      (await owner.send("PUT", `${workspace}/permissions`, { person, scope: "action", key: "task.delete", value: "maybe" })).status,
    ).toBe(400);
    expect((await owner.send("PUT", `${workspace}/permissions`, { person, scope: "action", key: "no.such", value: "on" })).status).toBe(
      400,
    );
    expect(
      (
        await owner.send("PUT", `${workspace}/permissions`, {
          person: "email:nobody@example.test",
          scope: "action",
          key: "task.delete",
          value: "on",
        })
      ).status,
    ).toBe(404);
  });

  it("sends a press whose setting is ask to an Owner's Inbox, and does it as that person's only if the Owner allows", async () => {
    const launch = await team("roleask");
    const { owner, workspace } = launch;
    const bo = await member(launch, "roleask-bo@example.test", "Bo");
    const cy = await member(launch, "roleask-cy@example.test", "Cy");
    const press = (as: typeof bo, id: string, input: object, requestId: string) =>
      as.send("POST", `${launch.base}/actions/${id}`, { input, requestId });
    await press(owner, "task.create", { title: "Old draft" }, "t1");
    await press(owner, "task.create", { title: "Older draft" }, "t2");
    const set = await owner.send("PUT", `${workspace}/permissions`, {
      person: "email:roleask-bo@example.test",
      scope: "action",
      key: "task.delete",
      value: "ask",
    });
    expect(set.status).toBe(200);

    const waiting = await press(bo, "task.delete", { task: "DT-1" }, "bo-1");
    expect(waiting.status).toBe(202);
    expect(await waiting.json()).toMatchObject({ _tag: "Ask", sentence: "Bo deleted DT-1 for good", waiting: true });
    expect((await press(bo, "task.delete", { task: "DT-1" }, "bo-1")).status).toBe(202);
    expect((await board(launch)).tasks.map(({ id }) => id)).toEqual(["DT-1", "DT-2"]);

    const open = (await inbox(owner, launch)).filter(({ answer }) => answer === undefined);
    expect(open).toEqual([
      expect.objectContaining({
        kind: "approval",
        title: "Bo deleted DT-1 for good",
        options: ["Allow once", "Deny"],
        managerName: "Launch",
      }),
    ]);
    expect(await inbox(cy, launch)).toEqual([]);
    const item = `${workspace}/inbox/${encodeURIComponent(open[0]?.id ?? "")}`;
    expect((await cy.send("POST", item, { choice: "Allow once" })).status).toBe(404);
    expect((await board(launch)).tasks).toHaveLength(2);

    expect((await owner.send("POST", item, { choice: "Allow once" })).status).toBe(200);
    await eventually(
      () => board(launch),
      ({ tasks }) => tasks.length === 1,
    );
    expect((await board(launch)).tasks.map(({ id }) => id)).toEqual(["DT-2"]);
    const lines = (await entries(launch, `?manager=${launch.manager.managerId}&category=tasks`)).entries.filter(
      ({ action }) => action === "task.delete",
    );
    expect(lines.map(({ by, outcome, permission, approvedBy }) => [by.name, outcome, permission, approvedBy])).toEqual([
      ["Bo", "done", "ask", "email:roleask@example.test"],
      ["Bo", "asked", "ask", undefined],
    ]);

    await press(bo, "task.delete", { task: "DT-2" }, "bo-2");
    const next = (
      await eventually(
        () => inbox(owner, launch),
        (items) => items.some(({ answer }) => answer === undefined),
      )
    ).find(({ answer }) => answer === undefined);
    expect((await owner.send("POST", `${workspace}/inbox/${encodeURIComponent(next?.id ?? "")}`, { choice: "Deny" })).status).toBe(200);
    expect((await board(launch)).tasks.map(({ id }) => id)).toEqual(["DT-2"]);
    const refused = (await entries(launch, `?manager=${launch.manager.managerId}&outcome=refused`)).entries;
    expect(refused).toEqual([
      expect.objectContaining({ action: "task.delete", sentence: "Bo deleted DT-2 for good", approvedBy: "email:roleask@example.test" }),
    ]);
  });

  it("refuses everyone but an Owner, and anyone outside the workspace", async () => {
    const launch = await team("rolerefuse");
    const bo = await member(launch, "rolerefuse-bo@example.test", "Bo");
    const body = { person: "email:rolerefuse-bo@example.test", scope: "action", key: "manager.create", value: "on" };
    expect((await bo.send("PUT", `${launch.workspace}/permissions`, body)).status).toBe(403);
    expect((await bo.send("GET", `${launch.workspace}/permissions`)).status).toBe(403);
    const other = await team("rolerefuse-other");
    expect((await other.owner.send("PUT", `${launch.workspace}/permissions`, body)).status).toBe(404);
    expect((await other.owner.send("GET", `${launch.workspace}/roles`)).status).toBe(404);
    expect((await launch.owner.send("GET", `${launch.workspace}/roles`)).status).toBe(200);
  });
});

describe("a person's own profile and notifications", () => {
  it("keeps a profile per person, and refuses a bad time zone or hours", async () => {
    const launch = await team("profiles");
    const bo = await member(launch, "profiles-bo@example.test", "Bo");
    const put = (as: typeof bo, body: object) => as.send("PUT", `${launch.workspace}/me/profile`, body);
    expect(
      (await put(bo, { timeZone: "Europe/Berlin", language: "de", workingHours: { days: [1, 2, 3, 4, 5], from: "09:00", to: "17:30" } }))
        .status,
    ).toBe(200);
    expect((await put(bo, { timeZone: "Nowhere/Land" })).status).toBe(400);
    expect((await put(bo, { language: "klingon" })).status).toBe(400);
    expect((await put(bo, { workingHours: { days: [1], from: "9am", to: "5pm" } })).status).toBe(400);
    expect((await put(bo, { timeZone: 5 })).status).toBe(400);
    const read = async (as: typeof bo) =>
      json<{ profile: ProfileView; role: string; person: { name: string } }>(await as.send("GET", `${launch.workspace}/me`));
    expect(await read(bo)).toMatchObject({
      role: "member",
      person: { name: "Bo" },
      profile: { timeZone: "Europe/Berlin", language: "de", workingHours: { days: [1, 2, 3, 4, 5], from: "09:00", to: "17:30" } },
    });
    expect((await read(launch.owner)).profile).toEqual({ timeZone: null, language: "en", workingHours: null });
    expect((await put(bo, { workingHours: null })).status).toBe(200);
    expect((await read(bo)).profile.workingHours).toBeNull();
    const other = await team("profiles-other");
    expect((await other.owner.send("GET", `${launch.workspace}/me`)).status).toBe(404);
  });

  it("mails a question only when asked to, and not outside working hours when quiet hours are on", async () => {
    const launch = await team("notices");
    const { owner, workspace } = launch;
    const address = "notices@example.test";
    const mailed = () => outbox.sent.filter(({ to, subject }) => to === address && subject.startsWith("When do we"));
    // The manager waits for each answer before it reads the next message, so each question is answered at once.
    const ask = async (text: string, n: number) => {
      await say(launch, `ask me: ${text}`, `ask-${n}`);
      const items = await eventually(
        () => inbox(owner, launch),
        (all) => all.length === n,
      );
      await owner.send("POST", `${workspace}/inbox/${encodeURIComponent(items.find((item) => item.answer === undefined)?.id ?? "")}`, {
        text: "Soon",
      });
      await eventually(
        () => chatLog(launch),
        (all) => all.filter(({ text }) => text === "Got it: Soon").length === n,
      );
    };

    await ask("When do we launch?", 1);
    expect(mailed()).toHaveLength(0);

    const choose = (body: object) => owner.send("PUT", `${workspace}/me/notifications`, body);
    expect((await choose({ email: { question: true } })).status).toBe(200);
    expect((await choose({ email: { bogus: true } })).status).toBe(400);
    expect((await choose({ quietHours: "yes" })).status).toBe(400);
    await ask("When do we ship?", 2);
    expect(mailed()).toHaveLength(1);
    expect(mailed()[0]?.text).toContain("When do we ship?");
    // The same item is not offered twice.
    await owner.send("GET", `${workspace}/inbox`);
    expect(mailed()).toHaveLength(1);

    // Working hours that leave out today, in UTC, so it is outside them now; then hours that take in all of today.
    const today = new Date(worldClock.now()).getUTCDay();
    const otherDays = [0, 1, 2, 3, 4, 5, 6].filter((day) => day !== today);
    await owner.send("PUT", `${workspace}/me/profile`, { timeZone: "UTC", workingHours: { days: otherDays, from: "00:00", to: "23:59" } });
    await choose({ quietHours: true });
    await ask("When do we test?", 3);
    expect(mailed()).toHaveLength(1);
    await owner.send("PUT", `${workspace}/me/profile`, { workingHours: { days: [0, 1, 2, 3, 4, 5, 6], from: "00:00", to: "23:59" } });
    await ask("When do we demo?", 4);
    expect(mailed()).toHaveLength(2);
    const state = await json<{ notifications: NotificationView }>(await owner.send("GET", `${workspace}/me`));
    expect(state.notifications).toMatchObject({
      quietHours: true,
      events: [
        { event: "question", email: true },
        { event: "approval", email: false },
        { event: "notice", email: false },
      ],
    });
  });
});
