import { describe, expect, it } from "vitest";
import { outbox } from "~/modules/mail/testing.ts";
import { offered } from "~/modules/manager/testing.ts";
import type { PermissionsView, TemplateCard } from "~/modules/manager/types.ts";
import type { Policy } from "~/modules/triggers/types.ts";
import { eventually, json } from "../../test/flows.ts";
import { press, saidBy } from "../../test/settings.ts";
import { chatLog, member, say, team } from "../../test/team.ts";

describe("a manager's permissions and who may ask", () => {
  it("shows what a manager may do against its template, and changes or resets it with the same button", async () => {
    const launch = await team("perms");
    const read = async () =>
      json<{ permissions: PermissionsView; actions: { id: string; default: string }[] }>(
        await launch.owner.send("GET", `${launch.base}/permissions`),
      );
    const first = await read();
    expect(first.permissions).toEqual({
      template: "kanban",
      categories: {},
      actions: {},
      templateDefaults: { categories: {}, actions: {} },
    });
    expect(first.actions.find(({ id }) => id === "message.new")?.default).toBe("ask");
    expect(first.actions.find(({ id }) => id === "task.delete")?.default).toBe("ask");

    expect((await press(launch, "self.permissions", { categories: { outside: "off" }, actions: { "task.delete": "on" } })).value?.ok).toBe(
      true,
    );
    expect((await read()).permissions).toMatchObject({ categories: { outside: "off" }, actions: { "task.delete": "on" } });
    expect((await press(launch, "self.permissions", { categories: { nowhere: "on" } })).value?.message).toBe(
      "There is no categorie nowhere",
    );
    expect((await press(launch, "self.permissions", { actions: { "task.delete": "maybe" } })).value?.message).toBe(
      "task.delete is on, off, ask or null",
    );
    expect((await press(launch, "self.permissions", {})).value?.ok).toBe(false);
    expect((await press(launch, "self.permissions", { categories: { outside: null } })).value?.ok).toBe(true);
    expect((await read()).permissions.categories).toEqual({});
    expect((await press(launch, "self.permissions", { reset: true })).value?.ok).toBe(true);
    expect((await read()).permissions.actions).toEqual({});

    // The tool follows what was set: a manager with delete turned off is not offered it at all.
    await press(launch, "self.permissions", { actions: { "task.delete": "off" } });
    offered.names = [];
    await say(launch, "Hello", "hello-1");
    await eventually(
      () => chatLog(launch),
      (all) => all.some(({ role }) => role === "manager"),
    );
    expect(offered.names).not.toContain("task_delete");
    expect(offered.names).toContain("lane_create");

    const bo = await member(launch, "perms-bo@example.test", "Bo");
    expect((await press(launch, "self.permissions", { reset: true }, bo))._tag).toBe("Refused");
    expect((await bo.send("GET", `${launch.base}/permissions`)).status).toBe(200);
    const other = await team("perms-other");
    expect((await other.owner.send("GET", `${launch.base}/permissions`)).status).toBe(404);
    expect(await saidBy(launch, "&category=itself")).toEqual(expect.arrayContaining(["Ama changed its own Permissions"]));
  });

  it("leaves the catalogue's own line when who may ask changes", async () => {
    const launch = await team("policylines");
    const url = `${launch.base}/policy`;
    const policy = (await json<{ policy: Policy }>(await launch.owner.send("GET", url))).policy;
    const next = {
      ...policy,
      acceptMode: "auto",
      allowed: [{ kind: "domain", domain: "acme.com" }],
      admission: { ...policy.admission, mailbox: "inferred" },
    };
    expect((await launch.owner.send("PUT", url, next)).status).toBe(200);
    expect((await launch.owner.send("PUT", url, { ...next, allowed: [] })).status).toBe(200);
    expect((await launch.owner.send("PUT", url, { ...next, allowed: [] })).status).toBe(200);
    const all = await saidBy(launch, "&category=who-may-ask");
    expect(all).toEqual(
      expect.arrayContaining([
        "Ama added *@acme.com on Launch to who may ask",
        "Ama set accepting work to auto",
        "Ama changed who is admitted in mailbox",
        "Ama removed *@acme.com on Launch from who may ask",
      ]),
    );
    expect(all).toHaveLength(4);
    const bo = await member(launch, "policylines-bo@example.test", "Bo");
    expect((await bo.send("PUT", url, policy)).status).toBe(403);
  });
});

describe("the template gallery and a manager's email", () => {
  it("lists the templates a manager can start from", async () => {
    const launch = await team("gallery");
    const { templates } = await json<{ templates: readonly TemplateCard[] }>(
      await launch.owner.send("GET", `${launch.workspace}/templates`),
    );
    expect(templates.map(({ id, opensOn }) => [id, opensOn])).toEqual([
      ["kanban", "kanban"],
      ["incident", "console"],
      ["support", "inbox"],
      ["research", "list"],
    ]);
    expect(templates[1]).toMatchObject({
      name: "Incident desk",
      lanes: expect.arrayContaining([expect.objectContaining({ id: "triage" })]),
      permissions: { actions: { "message.new": "on" } },
    });
    const other = await team("gallery-other");
    expect((await other.owner.send("GET", `${launch.workspace}/templates`)).status).toBe(404);
  });

  it("shows each manager's address and sends a test mail from it to the person who asked", async () => {
    const launch = await team("emailtest");
    const { workspace } = launch;
    const shown = await json<{ ending: string; addresses: { address: string; taskAddress: string }[] }>(
      await launch.owner.send("GET", `${workspace}/email`),
    );
    expect(shown.ending).toBe(".emailtest@co-worker.tech");
    expect(shown.addresses).toEqual([
      expect.objectContaining({
        address: "launch.emailtest@co-worker.tech",
        taskAddress: "launch.emailtest+dt-<number>@co-worker.tech",
      }),
    ]);
    const sent = await launch.owner.send("POST", `${workspace}/email/test`, { managerId: launch.manager.managerId });
    expect(sent.status).toBe(200);
    expect(outbox.lastTo("emailtest@example.test")).toMatchObject({
      from: "launch.emailtest@co-worker.tech",
      fromName: "Launch",
      subject: "A test from Launch",
    });
    expect((await launch.owner.send("POST", `${workspace}/email/test`, { managerId: "mgr_nobody" })).status).toBe(404);
    expect((await launch.owner.send("POST", `${workspace}/email/test`, {})).status).toBe(400);
    const bo = await member(launch, "emailtest-bo@example.test", "Bo");
    expect((await bo.send("POST", `${workspace}/email/test`, { managerId: launch.manager.managerId })).status).toBe(403);
    const other = await team("emailtest-other");
    expect((await other.owner.send("POST", `${workspace}/email/test`, { managerId: launch.manager.managerId })).status).toBe(404);
    expect(await saidBy(launch)).toContain("Ama sent a test mail from launch.emailtest@co-worker.tech");
  });
});
