import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { APP, browser, json } from "../../test/flows.ts";
import { member, team } from "../../test/team.ts";

const worker = (exports as unknown as { default: { fetch(request: Request): Promise<Response> } }).default;

/** Every Settings route: its method, its path under the workspace, a body, and what a Member gets (an Owner may do all). */
const ROUTES: readonly (readonly [method: string, path: string, body: object | undefined, memberStatus: number])[] = [
  ["GET", "/general", undefined, 200],
  ["PUT", "/general", { name: "Changed" }, 403],
  ["PUT", "/logo", undefined, 403],
  ["DELETE", "/logo", { confirm: "logo" }, 403],
  ["GET", "/export", undefined, 403],
  ["GET", "/roles", undefined, 200],
  ["GET", "/permissions", undefined, 403],
  ["PUT", "/permissions", { person: "email:x@example.test", scope: "action", key: "task.delete", value: "on" }, 403],
  ["GET", "/me", undefined, 200],
  ["PUT", "/me/profile", { language: "en" }, 200],
  ["PUT", "/me/notifications", { quietHours: false }, 200],
  ["GET", "/usage", undefined, 403],
  ["PUT", "/budgets", { managerId: "mgr_x", budget: null }, 403],
  ["POST", "/models/anthropic_nothing/check", undefined, 403],
  ["PUT", "/models/anthropic_nothing", { key: "k" }, 403],
  ["DELETE", "/models/anthropic_nothing", { confirm: "anthropic_nothing" }, 403],
  ["GET", "/connections", undefined, 403],
  ["GET", "/secrets", undefined, 403],
  ["DELETE", "/secrets/github", { confirm: "github" }, 403],
  ["POST", "/environments/env_nothing/test", undefined, 403],
  ["DELETE", "/environments/env_nothing", { confirm: "env_nothing" }, 403],
  ["GET", "/agents", undefined, 200],
  ["POST", "/agents", { config: { name: "A" } }, 403],
  ["DELETE", "/agents/agent_nothing", { confirm: "agent_nothing" }, 403],
  ["GET", "/skills", undefined, 200],
  ["POST", "/skills", { name: "a", files: {} }, 403],
  ["GET", "/templates", undefined, 200],
  ["GET", "/email", undefined, 200],
  ["POST", "/email/test", { managerId: "mgr_x" }, 403],
  ["GET", "/audit", undefined, 403],
  ["GET", "/audit/export", undefined, 403],
];

describe("who may reach the Settings routes", () => {
  it("answers a stranger with nothing, another workspace's Owner with nothing, and a Member only what a Member may", async () => {
    const launch = await team("access");
    const other = await team("access-other");
    const bo = await member(launch, "access-bo@example.test", "Bo");
    const manager = `${launch.workspace}/managers/${launch.manager.managerId}`;
    const all = [
      ...ROUTES.map(([method, path, body, status]) => [method, `${launch.workspace}${path}`, body, status] as const),
      ["GET", `${manager}/permissions`, undefined, 200],
      ["GET", `${manager}/tasks/DT-1`, undefined, 404],
    ] as const;
    for (const [method, path, body, memberStatus] of all) {
      const label = `${method} ${path.replace(launch.workspace, "")}`;
      const unsigned = await browser().send(method, path, body);
      expect([label, unsigned.status]).toEqual([label, 401]);
      const outsider = await other.owner.send(method, path, body);
      expect([label, outsider.status]).toEqual([label, 404]);
      const asMember = await bo.send(method, path, body);
      expect([label, asMember.status]).toEqual([label, memberStatus]);
    }
  });

  it("refuses a change another site asks a signed-in Owner's browser to make", async () => {
    const launch = await team("access-site");
    const changes = [
      ["PUT", "/general", { name: "Hijacked" }],
      ["PUT", "/permissions", { person: "email:x@example.test", scope: "action", key: "task.delete", value: "on" }],
      ["DELETE", "/logo", { confirm: "logo" }],
      ["PUT", "/me/profile", { language: "de" }],
    ] as const;
    for (const [method, path, body] of changes) {
      const response = await worker.fetch(
        new Request(`${APP}${launch.workspace}${path}`, {
          method,
          headers: { origin: "https://evil.test", cookie: launch.owner.cookie, "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
      expect([method, path, response.status]).toEqual([method, path, 403]);
    }
    const kept = await json<{ general: { name: string } }>(await launch.owner.send("GET", `${launch.workspace}/general`));
    expect(kept.general.name).toBe("access-site");
  });
});
