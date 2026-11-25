import { describe, expect, it } from "vitest";
import type { SaveResult } from "~/modules/sandboxes/types.ts";
import type { AgentView, SkillView } from "~/modules/settings/types.ts";
import type { AuditEntry } from "~/modules/workspace/types.ts";
import { json } from "../../test/flows.ts";
import { builder } from "../../test/roles.ts";
import { member, team, type Team } from "../../test/team.ts";

const sentences = async ({ owner, workspace }: Team): Promise<readonly string[]> =>
  (await json<{ entries: readonly AuditEntry[] }>(await owner.send("GET", `${workspace}/audit`))).entries.map(({ sentence }) => sentence);

const docs = {
  name: "Docs writer",
  instructions: "You write and update product documentation.",
  thinking: "medium",
  tools: ["read", "edit"],
  skills: [],
};

describe("agents and skills", () => {
  it("saves an agent as versions, with its environment, and deletes it on confirmation", async () => {
    const launch = await team("agentsave");
    const { owner, workspace } = launch;
    const env = await json<SaveResult>(
      await owner.send("PUT", `${workspace}/environments`, { name: "Node", setup: "pnpm install", size: "2 vCPU · 4 GB" }),
    );
    if (env._tag !== "Saved") throw new Error(env._tag);
    const connection = (await json<{ connections: { id: string; models: string[] }[] }>(await owner.send("GET", `${workspace}/models`)))
      .connections[0];

    const made = await json<{ _tag: string; value: AgentView }>(
      await owner.send("POST", `${workspace}/agents`, {
        config: { ...docs, model: { connectionId: connection?.id, model: connection?.models[0] }, environment: env.environment.id },
        note: "First",
      }),
    );
    expect(made).toMatchObject({ _tag: "Saved", value: { version: 1, config: { name: "Docs writer", environment: env.environment.id } } });
    const id = made.value.id;
    expect(
      (await json<{ environments: { usedBy: string[] }[] }>(await owner.send("GET", `${workspace}/environments`))).environments[0]?.usedBy,
    ).toEqual(["Docs writer"]);

    const same = await json<{ value: AgentView }>(await owner.send("PUT", `${workspace}/agents/${id}`, { config: made.value.config }));
    expect(same.value.version).toBe(1);
    const next = await json<{ value: AgentView }>(
      await owner.send("PUT", `${workspace}/agents/${id}`, {
        config: { ...made.value.config, instructions: "Leave a marked placeholder.", model: null },
        note: "Placeholder rule",
      }),
    );
    expect(next.value).toMatchObject({ version: 2, config: { instructions: "Leave a marked placeholder.", model: null } });
    expect(next.value.versions.map(({ version, note }) => [version, note])).toEqual([
      [2, "Placeholder rule"],
      [1, "First"],
    ]);

    const clash = await owner.send("POST", `${workspace}/agents`, { config: docs });
    expect(clash.status).toBe(409);
    const renamed = await json<{ value: AgentView }>(
      await owner.send("PUT", `${workspace}/agents/${id}`, { config: { ...next.value.config, name: "Writer" } }),
    );
    expect(renamed.value).toMatchObject({ version: 3, config: { environment: env.environment.id } });
    for (const bad of [
      { ...docs, tools: ["rm"] },
      { ...docs, thinking: "extreme" },
      { ...docs, name: " " },
      { ...docs, skills: ["nothing"] },
      { ...docs, model: { connectionId: "x", model: "y" } },
    ]) {
      expect((await owner.send("POST", `${workspace}/agents`, { config: { ...bad, name: bad.name === " " ? " " : "Other" } })).status).toBe(
        400,
      );
    }
    const refused = async (body: object) => {
      const response = await owner.send("POST", `${workspace}/agents`, body);
      return [response.status, (await json<{ error?: string; reason?: string }>(response)).error] as const;
    };
    expect(await refused({ config: { ...docs, name: "Bad", tools: "bash" } })).toEqual([
      400,
      "tools must be of bash, read, edit, web_fetch",
    ]);
    expect(await refused({ config: { ...docs, name: "Bad", colour: "red" } })).toEqual([
      400,
      expect.stringContaining("colour is not a setting of an agent"),
    ]);
    // Beside the config, as it used to be sent, it would be dropped without a word.
    expect(await refused({ config: { ...docs, name: "Bad" }, environment: null })).toEqual([
      400,
      "environment is a setting of the agent: send it in config",
    ]);

    const listed = await json<{ agents: readonly AgentView[]; tools: readonly string[] }>(await owner.send("GET", `${workspace}/agents`));
    expect(listed.agents.map(({ config }) => config.name)).toEqual(["Writer"]);
    expect(listed.tools).toEqual(["bash", "read", "edit", "web_fetch"]);
    expect((await owner.send("DELETE", `${workspace}/agents/${id}`)).status).toBe(400);
    expect((await owner.send("DELETE", `${workspace}/agents/${id}`, { confirm: id })).status).toBe(200);
    expect(
      (await json<{ environments: { usedBy: string[] }[] }>(await owner.send("GET", `${workspace}/environments`))).environments[0]?.usedBy,
    ).toEqual([]);
    expect((await owner.send("DELETE", `${workspace}/agents/${id}`, { confirm: id })).status).toBe(404);
    expect(await sentences(launch)).toEqual(
      expect.arrayContaining(["Ama saved Docs writer as version 1", "Ama saved Docs writer as version 2", "Ama deleted the agent Writer"]),
    );
  });

  it("saves a skill with checks on what it says, and keeps one an agent uses", async () => {
    const launch = await team("skillsave");
    const { owner, workspace } = launch;
    const files = {
      "SKILL.md":
        "---\nname: page-reader\ndescription: Read web pages that need a browser.\n---\n# Page reader\nRun `node scripts/read.js <url>`.",
      "scripts/read.js": "console.log('read')",
      "scripts/render.js": "console.log('render')",
    };
    const made = await json<{ _tag: string; value: SkillView }>(
      await owner.send("POST", `${workspace}/skills`, { name: "page-reader", files, note: "Start" }),
    );
    expect(made).toMatchObject({ _tag: "Saved", value: { version: 1, name: "page-reader" } });
    expect(made.value.checks).toEqual([
      { level: "ok", text: "Name matches the folder" },
      { level: "ok", text: "Description says what it does and when to use it" },
      { level: "warn", text: "scripts/render.js is never mentioned in SKILL.md" },
    ]);
    const id = made.value.id;
    const mismatch = await json<{ value: SkillView }>(
      await owner.send("PUT", `${workspace}/skills/${id}`, {
        name: "page-reader",
        files: { ...files, "SKILL.md": files["SKILL.md"].replace("name: page-reader", "name: other") },
      }),
    );
    expect(mismatch.value).toMatchObject({
      version: 2,
      checks: expect.arrayContaining([{ level: "error", text: "The name in SKILL.md (other) is not the folder's, page-reader" }]),
    });

    for (const bad of [
      { name: "Page Reader", files },
      { name: "no-skill-md", files: { "a.md": "x" } },
      { name: "escape", files: { "SKILL.md": "x", "../outside.md": "x" } },
      { name: "absolute", files: { "SKILL.md": "x", "/etc/passwd": "x" } },
      { name: "huge", files: { "SKILL.md": "x".repeat(100_001) } },
    ]) {
      expect((await owner.send("POST", `${workspace}/skills`, bad)).status).toBe(400);
    }
    expect((await owner.send("POST", `${workspace}/skills`, { name: "page-reader", files })).status).toBe(409);

    await owner.send("POST", `${workspace}/agents`, { config: { ...docs, skills: ["page-reader"], model: null } });
    expect((await owner.send("DELETE", `${workspace}/skills/${id}`, { confirm: id })).status).toBe(400);
    expect((await owner.send("PUT", `${workspace}/skills/${id}`, { name: "renamed", files })).status).toBe(400);
    const agent = (await json<{ agents: AgentView[] }>(await owner.send("GET", `${workspace}/agents`))).agents[0];
    await owner.send("PUT", `${workspace}/agents/${agent?.id}`, { config: { ...docs, skills: [], model: null } });
    expect((await owner.send("DELETE", `${workspace}/skills/${id}`, { confirm: id })).status).toBe(200);
    expect((await json<{ skills: unknown[] }>(await owner.send("GET", `${workspace}/skills`))).skills).toEqual([]);
  });

  it("lets Builders build, keeps Members to reading, and keeps one workspace's agents from another", async () => {
    const launch = await team("agentroles");
    const { workspace } = launch;
    const mate = await builder(launch, "agentroles-mate@example.test", "Mate");
    const bo = await member(launch, "agentroles-bo@example.test", "Bo");
    const made = await json<{ value: AgentView }>(await mate.send("POST", `${workspace}/agents`, { config: { ...docs, model: null } }));
    expect(made.value.config.name).toBe("Docs writer");
    expect((await bo.send("GET", `${workspace}/agents`)).status).toBe(200);
    expect((await bo.send("POST", `${workspace}/agents`, { config: { ...docs, name: "Mine", model: null } })).status).toBe(403);
    expect((await bo.send("DELETE", `${workspace}/agents/${made.value.id}`, { confirm: made.value.id })).status).toBe(403);
    expect(
      (await bo.send("POST", `${workspace}/skills`, { name: "mine", files: { "SKILL.md": "---\nname: mine\ndescription: x\n---" } }))
        .status,
    ).toBe(403);
    const other = await team("agentroles-other");
    expect((await other.owner.send("GET", `${workspace}/agents`)).status).toBe(404);
    expect((await other.owner.send("PUT", `${workspace}/agents/${made.value.id}`, { config: { ...docs, model: null } })).status).toBe(404);
    expect((await json<{ agents: unknown[] }>(await other.owner.send("GET", `${other.workspace}/agents`))).agents).toEqual([]);
  });
});
