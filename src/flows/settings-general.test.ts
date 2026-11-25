import { describe, expect, it } from "vitest";
import { FAKE_KEYS } from "~/modules/models/testing.ts";
import { unzip } from "~/modules/settings/service.ts";
import type { GeneralView } from "~/modules/settings/types.ts";
import type { AuditEntry, CreateManagerResult, ManagerEntry } from "~/modules/workspace/types.ts";
import type { ModelConnection } from "~/modules/models/types.ts";
import { json, signUp } from "../../test/flows.ts";
import { PNG, sendRaw } from "../../test/raw.ts";
import { member, team, type Team } from "../../test/team.ts";

const general = async ({ owner, workspace }: Team) =>
  json<{ general: GeneralView; role: string }>(await owner.send("GET", `${workspace}/general`));
const entries = async ({ owner, workspace }: Team, query = "") =>
  (await json<{ entries: readonly AuditEntry[] }>(await owner.send("GET", `${workspace}/audit${query}`))).entries;

describe("workspace general settings", () => {
  it("renames the workspace and its address, and every manager's address follows", async () => {
    const acme = await team("renamed");
    const before = await general(acme);
    expect(before.general).toMatchObject({ name: "renamed", address: "renamed", mailDomain: "co-worker.tech", timeZone: "UTC" });

    const changed = await acme.owner.send("PUT", `${acme.workspace}/general`, { name: "Acme Inc", address: "acme-inc" });
    expect(changed.status).toBe(200);
    expect((await general(acme)).general).toMatchObject({ name: "Acme Inc", address: "acme-inc" });
    // Better Auth's own rename is closed: the name and slug are the workspace's, and change only together.
    const own = await acme.owner.send("POST", "/api/auth/organization/update", {
      data: { slug: "sneaky" },
      organizationId: acme.workspace.split("/").at(-1),
    });
    expect(own.status).toBe(404);

    const { workspaces } = await json<{ workspaces: readonly { name: string; address: string }[] }>(
      await acme.owner.send("GET", "/api/workspaces"),
    );
    expect(workspaces).toEqual([expect.objectContaining({ name: "Acme Inc", address: "acme-inc" })]);
    const managers = await json<{ managers: readonly ManagerEntry[] }>(await acme.owner.send("GET", `${acme.workspace}/managers`));
    expect(managers.managers.map(({ address }) => address)).toEqual(["launch.acme-inc@co-worker.tech"]);

    // The old address is free again; the new one is taken, and a bad one is refused.
    const stranger = await signUp("renamed-stranger@example.test", "Stranger");
    const taken = await stranger.send("POST", "/api/workspaces", { name: "Mine", address: "acme-inc", region: "eu" });
    expect(taken.status).toBe(409);
    const reused = await stranger.send("POST", "/api/workspaces", { name: "Mine", address: "renamed", region: "eu" });
    expect(reused.status).toBe(201);
    expect((await acme.owner.send("PUT", `${acme.workspace}/general`, { address: "renamed" })).status).toBe(409);
    expect((await acme.owner.send("PUT", `${acme.workspace}/general`, { address: "Not A Name!" })).status).toBe(400);

    const lines = (await entries(acme)).map(({ sentence }) => sentence);
    expect(lines).toContain("Ama renamed the workspace from renamed to Acme Inc");
    expect(lines).toContain("Ama changed the workspace address from renamed to acme-inc");
  });

  it("keeps a time zone and a default model that one of its working connections lists", async () => {
    const launch = await team("zones");
    const { connections } = await json<{ connections: readonly ModelConnection[] }>(
      await launch.owner.send("GET", `${launch.workspace}/models`),
    );
    const connection = connections[0];
    const model = connection?.models[0] ?? "";
    expect((await launch.owner.send("PUT", `${launch.workspace}/general`, { timeZone: "Europe/London" })).status).toBe(200);
    expect((await launch.owner.send("PUT", `${launch.workspace}/general`, { timeZone: "Mars/Olympus" })).status).toBe(400);
    expect(
      (await launch.owner.send("PUT", `${launch.workspace}/general`, { defaultModel: { connectionId: connection?.id, model: "nope" } }))
        .status,
    ).toBe(400);
    expect(
      (await launch.owner.send("PUT", `${launch.workspace}/general`, { defaultModel: { connectionId: connection?.id, model } })).status,
    ).toBe(200);
    expect((await general(launch)).general).toMatchObject({
      timeZone: "Europe/London",
      defaultModel: { connectionId: connection?.id, model },
    });
    expect((await launch.owner.send("PUT", `${launch.workspace}/general`, { name: 4 })).status).toBe(400);
    expect((await launch.owner.send("PUT", `${launch.workspace}/general`, { defaultModel: null })).status).toBe(200);
    expect((await general(launch)).general.defaultModel).toBeNull();
  });

  it("serves a logo as the picture it proved to be, and refuses anything else or too big", async () => {
    const launch = await team("logos");
    const { owner, workspace } = launch;
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect((await sendRaw(owner, "PUT", `${workspace}/logo`, svg, "image/svg+xml")).status).toBe(415);
    expect((await sendRaw(owner, "PUT", `${workspace}/logo`, svg, "image/png")).status).toBe(415);
    expect((await sendRaw(owner, "PUT", `${workspace}/logo`, new Uint8Array(300 * 1024).fill(1), "image/png")).status).toBe(413);
    expect((await owner.send("GET", `${workspace}/logo`)).status).toBe(404);
    expect((await sendRaw(owner, "PUT", `${workspace}/logo`, PNG, "image/svg+xml")).status).toBe(200);

    const served = await owner.send("GET", `${workspace}/logo`);
    expect(served.headers.get("content-type")).toBe("image/png");
    expect(served.headers.get("x-content-type-options")).toBe("nosniff");
    expect(served.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect([...new Uint8Array(await served.arrayBuffer())]).toEqual([...PNG]);
    expect((await general(launch)).general.hasLogo).toBe(true);

    const bo = await member(launch, "logo-bo@example.test", "Bo");
    expect((await bo.send("GET", `${workspace}/logo`)).status).toBe(200);
    expect((await sendRaw(bo, "PUT", `${workspace}/logo`, PNG, "image/png")).status).toBe(403);
    const other = await team("logos-other");
    expect((await other.owner.send("GET", `${workspace}/logo`)).status).toBe(404);
    expect((await sendRaw(other.owner, "PUT", `${workspace}/logo`, PNG, "image/png")).status).toBe(404);

    expect((await owner.send("DELETE", `${workspace}/logo`)).status).toBe(400);
    expect((await owner.send("DELETE", `${workspace}/logo`, { confirm: "logo" })).status).toBe(200);
    expect((await owner.send("GET", `${workspace}/logo`)).status).toBe(404);
    expect((await entries(launch)).map(({ sentence }) => sentence)).toEqual(
      expect.arrayContaining(["Ama changed the workspace logo", "Ama removed the workspace logo"]),
    );
  });

  it("exports everything the workspace holds, with no secret value in it", async () => {
    const launch = await team("exports");
    const { owner, workspace } = launch;
    expect((await owner.send("PUT", `${workspace}/secrets/github`, { value: "ghs_super_secret_installation_token" })).status).toBe(200);
    await owner.send("POST", `${launch.base}/chat`, { text: "add a task: Write the docs", requestId: "export-1" });
    await owner.send("PUT", `${workspace}/environments`, {
      name: "Node",
      setup: "export TOKEN=vault:github\npnpm install",
      size: "2 vCPU · 4 GB",
    });
    const made = await json<CreateManagerResult>(
      await owner.send("POST", `${workspace}/managers`, { name: "Second", template: "support" }),
    );
    expect(made._tag).toBe("Created");

    const response = await owner.send("GET", `${workspace}/export`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    const files = unzip(new Uint8Array(await response.arrayBuffer()));
    const paths = files.map(({ path }) => path);
    expect(paths).toEqual(
      expect.arrayContaining([
        "workspace.json",
        "members.json",
        "secrets.json",
        "models.json",
        "managers/launch/board.json",
        "managers/second/pages.json",
        "audit.json",
      ]),
    );
    const text = (path: string) => new TextDecoder().decode(files.find((file) => file.path === path)?.bytes);
    expect(JSON.parse(text("secrets.json"))).toEqual([expect.objectContaining({ name: "github" })]);
    expect(JSON.parse(text("members.json"))).toEqual([{ name: "Ama", email: "exports@example.test", role: "owner" }]);
    expect(JSON.parse(text("environments.json"))[0].setup).toContain("TOKEN=vault:github");
    const all = files.map((file) => new TextDecoder().decode(file.bytes)).join("\n");
    for (const secret of ["ghs_super_secret_installation_token", FAKE_KEYS.anthropic]) expect(all).not.toContain(secret);
    expect(all).not.toContain("linkSecret");
    expect((await entries(launch)).map(({ sentence }) => sentence)).toContain("Ama exported the workspace's data");

    const bo = await member(launch, "export-bo@example.test", "Bo");
    expect((await bo.send("GET", `${workspace}/export`)).status).toBe(403);
    const other = await team("exports-other");
    expect((await other.owner.send("GET", `${workspace}/export`)).status).toBe(404);
  });
});
