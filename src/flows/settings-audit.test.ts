import { describe, expect, it } from "vitest";
import type { AuditEntry } from "~/modules/workspace/types.ts";
import { eventually, json } from "../../test/flows.ts";
import { member, team, type Team } from "../../test/team.ts";

const entries = async ({ owner, workspace }: Team, query = "") =>
  json<{ entries: readonly AuditEntry[]; next?: string }>(await owner.send("GET", `${workspace}/audit${query}`));
const sentences = async (launch: Team, query = ""): Promise<readonly string[]> =>
  (await entries(launch, query)).entries.map(({ sentence }) => sentence);

describe("the audit log, filtered, in pages, and exported", () => {
  it("reads by who, where, category, permission and time, a page at a time", async () => {
    const launch = await team("audits");
    const { owner, workspace } = launch;
    for (const [n, zone] of ["Europe/Paris", "Europe/Rome", "Europe/Oslo"].entries()) {
      await owner.send("PUT", `${workspace}/general`, { timeZone: zone });
      await owner.send("POST", `${launch.base}/actions/task.create`, { input: { title: `Task ${n}` }, requestId: `a-${n}` });
    }
    await eventually(
      async () => (await entries(launch, "?category=tasks")).entries.length,
      (n) => n >= 3,
    );
    expect(await sentences(launch, "?category=settings&limit=2")).toEqual([
      "Ama set the workspace time zone to Europe/Oslo",
      "Ama set the workspace time zone to Europe/Rome",
    ]);
    const first = await entries(launch, "?category=settings&limit=2");
    const rest = await entries(launch, `?category=settings&limit=2&before=${encodeURIComponent(first.next ?? "")}`);
    expect(rest.entries.map(({ sentence }) => sentence)).toEqual(["Ama set the workspace time zone to Europe/Paris"]);
    expect(rest.next).toBeUndefined();

    const tasks = (await entries(launch, "?category=tasks")).entries;
    expect(tasks.every(({ managerId, by }) => managerId === launch.manager.managerId && by.name === "Ama")).toBe(true);
    expect(
      (await entries(launch, `?manager=${launch.manager.managerId}`)).entries.every(
        ({ managerId }) => managerId === launch.manager.managerId,
      ),
    ).toBe(true);
    expect((await entries(launch, "?manager=")).entries.every(({ managerId }) => managerId === "")).toBe(true);
    expect((await entries(launch, "?permission=off")).entries).toEqual([]);
    expect((await entries(launch, "?kind=manager")).entries).toEqual([]);
    expect((await entries(launch, `?since=${Date.now() + 60_000}`)).entries).toEqual([]);
    expect((await owner.send("GET", `${workspace}/audit?permission=maybe`)).status).toBe(400);
    expect((await owner.send("GET", `${workspace}/audit?since=yesterday`)).status).toBe(400);
  });

  it("exports the filtered lines as csv, audits the export, and keeps it from anyone but an Owner", async () => {
    const launch = await team("auditcsv");
    const { owner, workspace } = launch;
    await owner.send("PUT", `${workspace}/general`, { timeZone: "Europe/Paris" });
    const response = await owner.send("GET", `${workspace}/audit/export?category=settings`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    const lines = (await response.text()).trim().split("\r\n");
    expect(lines[0]).toBe("When,Who,Kind,What happened,Ran under,Outcome,Action,Where");
    expect(lines[1]).toContain("Ama set the workspace time zone to Europe/Paris");
    expect(lines).toHaveLength(2);
    expect(await sentences(launch)).toContain("Ama exported 1 lines of the audit log");
    const bo = await member(launch, "auditcsv-bo@example.test", "Bo");
    expect((await bo.send("GET", `${workspace}/audit/export`)).status).toBe(403);
    expect((await bo.send("GET", `${workspace}/audit`)).status).toBe(403);
    const other = await team("auditcsv-other");
    expect((await other.owner.send("GET", `${workspace}/audit/export`)).status).toBe(404);
  });
});
