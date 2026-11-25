import { describe, expect, it } from "vitest";
import type { CreateManagerResult } from "~/modules/workspace/types.ts";
import type { CreateWorkspaceResult } from "~/modules/workspaces/types.ts";
import { eventually, json, signUp } from "../../test/flows.ts";
import { chatLog, member, say, team, type Team } from "../../test/team.ts";

describe("talking to a manager", () => {
  it("an answer being written is the chat's last line until it has an entry, and grows meanwhile", async () => {
    const launch = await team("talking");
    await say(launch, "write at length about exports", "long-1");
    const first = await eventually(
      () => chatLog(launch),
      (lines) => lines.at(-1)?.streaming === true,
    );
    const partial = first.at(-1);
    expect(partial).toMatchObject({ role: "manager", streaming: true });
    expect(partial?.text).toContain("Point 1:");
    expect(partial?.text).not.toContain("That is the whole of it.");
    const grown = await eventually(
      () => chatLog(launch),
      (lines) => (lines.at(-1)?.text.length ?? 0) > (partial?.text.length ?? 0),
    );
    expect(grown.at(-1)?.text.length).toBeGreaterThan(partial?.text.length ?? 0);
    const whole = await eventually(
      () => chatLog(launch),
      (lines) => lines.some(({ text }) => text.endsWith("That is the whole of it.")) && lines.every(({ streaming }) => streaming !== true),
      20_000,
    );
    expect(whole.filter(({ role }) => role === "manager")).toHaveLength(1);
  });

  it("a manager's page says whether it can answer, and whether this person can fix that", async () => {
    const owner = await signUp("nomodel@example.test", "Ama");
    const created = await json<CreateWorkspaceResult>(
      await owner.send("POST", "/api/workspaces", { name: "nomodel", address: "nomodel", region: "eu" }),
    );
    if (created._tag !== "Created") throw new Error(created._tag);
    const workspace = `/api/workspaces/${created.workspace.workspaceId}`;
    const made = await json<CreateManagerResult>(await owner.send("POST", `${workspace}/managers`, { name: "Launch", template: "kanban" }));
    if (made._tag !== "Created") throw new Error(made._tag);
    const launch: Team = { owner, workspace, base: `${workspace}/managers/${made.manager.managerId}`, manager: made.manager };
    const stateFor = async (who: Team["owner"]) => (await json<{ model: unknown }>(await who.send("GET", launch.base))).model;

    expect(await stateFor(owner)).toMatchObject({ ready: false, canFix: true, reason: expect.stringContaining("No model is connected") });
    const chidi = await member(launch, "chidi.nomodel@example.test", "Chidi");
    expect(await stateFor(chidi)).toMatchObject({ ready: false, canFix: false });

    await owner.send("POST", `${workspace}/models`, { source: "anthropic", key: "sk-ant-test-works" });
    expect(await stateFor(owner)).toEqual({ ready: true });
    expect(await stateFor(chidi)).toEqual({ ready: true });
  });
});
