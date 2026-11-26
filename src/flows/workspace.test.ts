import { describe, expect, it } from "vitest";
import { outbox } from "~/modules/mail/testing.ts";
import type { WorkspaceApi } from "~/modules/workspace/types.ts";
import type { CreateWorkspaceResult, WorkspaceEntry } from "~/modules/workspaces/types.ts";
import { faults, placements } from "~/modules/workspaces/testing.ts";
import { bindings, json, signUp, type Browser } from "../../test/flows.ts";

interface Row {
  readonly workspaceId: string;
  readonly objectId: string;
  readonly region: string;
}

const rowOf = (workspaceId: string) =>
  bindings.AUTH.prepare(`SELECT * FROM "workspace_directory" WHERE "workspaceId" = ?`).bind(workspaceId).first<Row>();

async function create(owner: Browser, address: string, region: "eu" | "us"): Promise<WorkspaceEntry> {
  const response = await owner.send("POST", "/api/workspaces", { name: address.toUpperCase(), address, region });
  expect(response.status).toBe(201);
  const result = await json<CreateWorkspaceResult>(response);
  if (result._tag !== "Created") throw new Error(result._tag);
  return result.workspace;
}

describe("workspace flows", () => {
  it("flw:workspace/create", async () => {
    const ada = await signUp("ada@example.test", "Ada");
    const acme = await create(ada, "acme", "eu");
    const row = await rowOf(acme.workspaceId);
    expect(row).toMatchObject({ workspaceId: acme.workspaceId, region: "eu" });
    expect(placements.get(row?.objectId ?? "")).toBe("eu");
    const object = bindings.WORKSPACE.get(bindings.WORKSPACE.idFromString(row?.objectId ?? "")) as unknown as WorkspaceApi;
    expect(await object.describe()).toMatchObject({
      _tag: "Found",
      profile: { workspaceId: acme.workspaceId, region: "eu", address: "acme" },
    });

    faults.failNextProvision();
    const broken = await ada.send("POST", "/api/workspaces", { name: "Broken", address: "broken", region: "us" });
    expect(broken.status).toBe(502);
    expect(await bindings.AUTH.prepare(`SELECT 1 FROM "organization" WHERE "slug" = 'broken'`).first()).toBeNull();
    const orphans = await bindings.AUTH.prepare(
      `SELECT COUNT(*) AS n FROM "organization" o LEFT JOIN "workspace_directory" d ON d."workspaceId" = o."id" WHERE d."workspaceId" IS NULL`,
    ).first<{ n: number }>();
    expect(orphans?.n).toBe(0);
  });

  it("flw:workspace/many", async () => {
    const ada = await signUp("ada.many@example.test", "Ada");
    const red = await create(ada, "red-team", "eu");
    const blue = await create(ada, "blue-team", "us");
    const listed = await json<{ workspaces: WorkspaceEntry[] }>(await ada.send("GET", "/api/workspaces"));
    expect(listed.workspaces.map((entry) => entry.address).sort()).toEqual(["blue-team", "red-team"]);
    expect(await json(await ada.send("GET", `/api/workspaces/${red.workspaceId}`))).toMatchObject({
      profile: { name: "RED-TEAM", region: "eu" },
    });
    expect(await json(await ada.send("GET", `/api/workspaces/${blue.workspaceId}`))).toMatchObject({
      profile: { name: "BLUE-TEAM", region: "us" },
    });

    const invited = await ada.send("POST", "/api/auth/organization/invite-member", {
      email: "bo@example.test",
      role: "member",
      organizationId: red.workspaceId,
    });
    expect(invited.status).toBe(200);
    const invitationId = /\/join\/invite\/(\S+)/u.exec(outbox.lastTo("bo@example.test")?.text ?? "")?.[1];
    const bo = await signUp("bo@example.test", "Bo");
    expect((await bo.send("POST", "/api/auth/organization/accept-invitation", { invitationId })).status).toBe(200);

    expect(await json(await bo.send("GET", `/api/workspaces/${red.workspaceId}`))).toMatchObject({
      _tag: "Opened",
      role: "member",
      profile: { name: "RED-TEAM" },
    });
    const refused = await bo.send("GET", `/api/workspaces/${blue.workspaceId}`);
    expect(refused.status).toBe(404);
    expect(JSON.stringify(await refused.json())).not.toContain("BLUE");
    expect((await bo.send("DELETE", `/api/workspaces/${red.workspaceId}`)).status).toBe(403);
    expect((await bo.send("GET", "/api/workspaces")).status).toBe(200);
  });
});
