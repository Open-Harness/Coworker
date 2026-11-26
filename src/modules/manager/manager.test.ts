import { describe, expect, it } from "vitest";
import type { ManagerApi, ManagerProfile } from "./types.ts";
import { bindings } from "../../../test/flows.ts";

const manager = (): ManagerApi => bindings.MANAGER.get(bindings.MANAGER.newUniqueId()) as unknown as ManagerApi;

const profile: ManagerProfile = {
  managerId: "mgr_test",
  workspaceId: "ws_test",
  name: "Support",
  slug: "support",
  address: "support.acme@co-worker.tech",
  template: "support",
  createdBy: "email:ama@example.test",
  createdAt: 1,
  workspaceObjectId: "none",
  region: "eu",
};

describe("a manager object", () => {
  it("answers NotProvisioned until it is set up", async () => {
    const object = manager();
    expect(await object.describe()).toEqual({ _tag: "NotProvisioned" });
    expect(await object.board()).toEqual({ _tag: "NotProvisioned" });
    expect(await object.progress()).toEqual({ _tag: "NotProvisioned" });
    expect(await object.chat({ text: "hi", by: { id: "email:a@example.test", name: "A" }, requestId: "r" })).toEqual({
      _tag: "NotProvisioned",
    });
  });

  it("is set up from its template once", async () => {
    const object = manager();
    expect(await object.provision(profile)).toEqual({ _tag: "Provisioned" });
    expect(await object.provision({ ...profile, managerId: "mgr_other" })).toEqual({ _tag: "AlreadyProvisioned", managerId: "mgr_test" });
    const board = await object.board();
    expect(board).toMatchObject({ defaultView: "inbox", lanes: [{ id: "new" }, { id: "waiting" }, { id: "solved" }] });
    // What the dashboards count: the lanes, and no task or run yet.
    expect(await object.progress()).toEqual({
      lanes: [
        { id: "new", name: expect.any(String) },
        { id: "waiting", name: expect.any(String) },
        { id: "solved", name: expect.any(String) },
      ],
      tasks: [],
      runs: [],
    });
    expect(await object.destroy()).toEqual({ _tag: "Destroyed" });
  });
});
