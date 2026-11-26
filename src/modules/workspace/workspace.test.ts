import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { Env } from "~/main.ts";
import type { WorkspaceProfile } from "./types.ts";

const { WORKSPACE } = env as unknown as Env;
const profile = (workspaceId: string): WorkspaceProfile => ({
  workspaceId,
  name: "Acme",
  address: "acme",
  region: "eu",
  createdBy: "user_1",
  createdAt: Date.UTC(2026, 10, 23),
});

describe("workspace", () => {
  it("answers NotProvisioned until provisioned, then its profile", async () => {
    const stub = WORKSPACE.get(WORKSPACE.newUniqueId());
    expect(await stub.describe()).toEqual({ _tag: "NotProvisioned" });
    expect(await stub.provision(profile("ws_a"))).toEqual({ _tag: "Provisioned" });
    expect(await stub.describe()).toEqual({ _tag: "Found", profile: profile("ws_a") });
  });

  it("is provisioned once; a second provision changes nothing", async () => {
    const stub = WORKSPACE.get(WORKSPACE.newUniqueId());
    await stub.provision(profile("ws_b"));
    expect(await stub.provision({ ...profile("ws_other"), name: "Other" })).toEqual({ _tag: "AlreadyProvisioned", workspaceId: "ws_b" });
    expect(await stub.describe()).toMatchObject({ profile: { name: "Acme" } });
  });

  it("forgets everything when destroyed", async () => {
    const stub = WORKSPACE.get(WORKSPACE.newUniqueId());
    await stub.provision(profile("ws_c"));
    expect(await stub.destroy()).toEqual({ _tag: "Destroyed" });
    expect(await stub.describe()).toEqual({ _tag: "NotProvisioned" });
  });
});
