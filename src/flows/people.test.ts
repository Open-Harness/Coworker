import { describe, expect, it } from "vitest";
import { eventually } from "../../test/flows.ts";
import type { InboxItem } from "~/modules/workspace/types.ts";
import { audit, board, chatLog, inbox, member, say, team } from "../../test/team.ts";

const answer = (launch: Awaited<ReturnType<typeof team>>, itemId: string, body: unknown) =>
  launch.owner.send("POST", `${launch.workspace}/inbox/${encodeURIComponent(itemId)}`, body);

describe("permissions, asking and the Inbox", () => {
  it("flw:permissions/ask", async () => {
    const launch = await team("ask");
    await say(launch, "add a task: Old draft", "t1");
    await say(launch, "add a task: Older draft", "t2");
    await eventually(
      () => board(launch),
      ({ tasks }) => tasks.length === 2,
    );

    await say(launch, "delete DT-1", "d1");
    const [item] = await eventually(
      () => inbox(launch.owner, launch),
      (items) => items.length === 1,
    );
    expect(item).toMatchObject({
      kind: "approval",
      title: "Launch deleted DT-1 for good",
      options: ["Allow once", "Always allow", "Deny"],
    });
    expect((await board(launch)).tasks.map(({ id }) => id)).toEqual(["DT-1", "DT-2"]);
    expect((await audit(launch)).filter(({ action }) => action === "task.delete")).toEqual([]);
    expect((await answer(launch, item?.id ?? "", { choice: "Allow once" })).status).toBe(200);
    await eventually(
      () => board(launch),
      ({ tasks }) => tasks.length === 1,
    );
    expect((await board(launch)).tasks.map(({ id }) => id)).toEqual(["DT-2"]);
    const allowed = await eventually(
      () => audit(launch),
      (entries) => entries.some(({ action }) => action === "task.delete"),
    );
    expect(allowed.filter(({ action }) => action === "task.delete")).toEqual([
      expect.objectContaining({
        permission: "ask",
        approvedBy: "email:ask@example.test",
        outcome: "done",
        sentence: "Launch deleted DT-1 for good",
      }),
    ]);

    await say(launch, "delete DT-2", "d2");
    const second = await eventually(
      () => inbox(launch.owner, launch),
      (items) => items.some(({ answer: given }) => given === undefined),
    );
    const open = second.find(({ answer: given }) => given === undefined);
    await answer(launch, open?.id ?? "", { choice: "Deny" });
    const lines = await eventually(
      () => chatLog(launch),
      (all) => all.some(({ role, text }) => role === "manager" && text.includes("did not allow")),
    );
    expect(lines.at(-1)).toMatchObject({
      role: "manager",
      text: 'That did not work: Refused: Ama did not allow "Launch deleted DT-2 for good"',
    });
    expect((await board(launch)).tasks.map(({ id }) => id)).toEqual(["DT-2"]);
    const refused = await eventually(
      () => audit(launch),
      (entries) => entries.some(({ outcome }) => outcome === "refused"),
    );
    expect(refused.find(({ outcome }) => outcome === "refused")).toMatchObject({ action: "task.delete", permission: "ask" });
  });

  it("flw:permissions/off", async () => {
    const launch = await team("off");
    const bo = await member(launch, "bo@example.test", "Bo");
    const pressed = await bo.send("POST", `${launch.base}/actions/lane.create`, { input: { name: "Blocked" }, requestId: "lane-1" });
    expect(pressed.status).toBe(403);
    expect(await pressed.json()).toMatchObject({ _tag: "Refused", reason: "Add a lane is turned off for Bo" });
    const entries = await eventually(
      () => audit(launch),
      (all) => all.length > 0,
    );
    expect(entries).toEqual([
      expect.objectContaining({
        action: "lane.create",
        by: { kind: "person", id: "email:bo@example.test", name: "Bo" },
        permission: "off",
        outcome: "refused",
      }),
    ]);
    expect(entries[0]?.sentence).toBe("Bo added the lane Blocked");
    expect((await bo.send("GET", `${launch.workspace}/audit`)).status).toBe(403);
  });

  it("says in the audit log who was asked and which agent was started, also when the manager left them out", async () => {
    const launch = await team("said");
    await say(launch, "add a task: Ship the beta", "t1");
    await say(launch, "start a writer on DT-1 Write it", "r1");
    await say(launch, "ask me: When do we launch?", "q1");
    const entries = await eventually(
      () => audit(launch),
      (all) => ["run.start", "question.ask"].every((id) => all.some(({ action }) => action === id)),
    );
    const said = entries.map(({ sentence }) => sentence);
    expect(said).toContain("Launch started Worker as writer on DT-1");
    expect(said).toContain("Launch asked said@example.test: When do we launch?");
  });

  it("flw:inbox/question", async () => {
    const launch = await team("question");
    await say(launch, "ask me: When do we launch?", "q1");
    await eventually(
      () => inbox(launch.owner, launch),
      (items) => items.length === 1,
    );
    await say(launch, "ask me: When do we launch?", "q2");
    const items = await inbox(launch.owner, launch);
    expect(items).toEqual([expect.objectContaining({ kind: "question", title: "When do we launch?", managerName: "Launch" })]);
    await answer(launch, items[0]?.id ?? "", { text: "Friday" });
    const lines = await eventually(
      () => chatLog(launch),
      (all) => all.filter(({ text }) => text === "Got it: Friday").length === 2,
    );
    expect(lines.filter(({ text }) => text === "Got it: Friday")).toHaveLength(2);
    expect(await inbox(launch.owner, launch)).toEqual([expect.objectContaining({ answer: expect.objectContaining({ text: "Friday" }) })]);
  });

  it("flw:inbox/own-words", async () => {
    const launch = await team("words");
    await say(launch, "ask me: When do we launch?", "q1");
    const [first] = await eventually(
      () => inbox(launch.owner, launch),
      (items) => items.length === 1,
    );
    await answer(launch, first?.id ?? "", { text: "Not sure, maybe next week?" });
    const again = await eventually(
      () => inbox(launch.owner, launch),
      (items) => items.length === 2,
    );
    const open = again.find(({ answer: given }) => given === undefined);
    expect(open).toMatchObject({ kind: "question", title: "Could you give me one day?" });
    await answer(launch, open?.id ?? "", { text: "Friday the 4th" });
    const lines = await eventually(
      () => chatLog(launch),
      (all) => all.some(({ text }) => text === "Got it: Friday the 4th"),
    );
    expect(lines.some(({ role, text }) => role === "action" && text === "question_ask: Ama answered: Not sure, maybe next week?")).toBe(
      true,
    );
    expect(lines.at(-1)).toMatchObject({ role: "manager", text: "Got it: Friday the 4th" });
  });
});

describe("a question's detail", () => {
  it("a question carries its context, options and links", async () => {
    const launch = await team("detail");
    await say(launch, "add a task: Ship the beta", "t1");
    await eventually(
      () => board(launch),
      ({ tasks }) => tasks.length === 1,
    );
    await say(launch, "ask me to decide on DT-1: Do we slip the date? Keep the date | Slip a week | Cut scope", "q1");
    const [item] = await eventually(
      () => inbox(launch.owner, launch),
      (items) => items.length === 1,
    );
    const one = await launch.owner.send("GET", `${launch.workspace}/inbox/${encodeURIComponent(item?.id ?? "")}`);
    const { item: detailed } = (await one.json()) as { item: InboxItem };
    expect(detailed.options).toEqual(["Keep the date", "Slip a week", "Cut scope"]);
    expect(detailed.detail?.context).toContain("won't pick this alone");
    expect(detailed.detail?.choices[1]).toEqual({ label: "Slip a week", next: ["The manager carries on with Slip a week"] });
    expect(detailed.detail?.recommend?.option).toBe("Keep the date");
    expect(detailed.detail?.links).toEqual([
      { kind: "task", ref: "DT-1", title: "Ship the beta", sub: expect.any(String) },
      { kind: "page", ref: "mission", title: "Launch", sub: "Mission" },
    ]);
    expect(detailed.detail?.facts[1]?.source?.ref).toBe("mission");
    expect((await launch.owner.send("GET", `${launch.workspace}/inbox/nope`)).status).toBe(404);

    await answer(launch, detailed.id, { choice: "Slip a week" });
    await eventually(
      () => chatLog(launch),
      (lines) => lines.some(({ text }) => text === "Got it: Slip a week"),
    );
  });
});
