import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { liveApp, isFailed, type Provisioned, type Seed, type Session } from "~/modules/liveapp/service.ts";
import { outbox } from "~/modules/mail/testing.ts";
import { FAKE_ENDPOINT } from "~/modules/models/testing.ts";
import { eventually } from "../../test/flows.ts";
import { installed } from "../../test/github.ts";
import { mail } from "../../test/email.ts";
import type { Team } from "../../test/team.ts";

/*
 * Support tests for the live runner's own client of the app, run against the whole Worker in the fast tier: signing in
 * for real through the emailed link, setting the test workspace up idempotently, and the reads and assertions the live
 * email tests make (a task on the board, one line in Events, no task for a stranger).
 */

const worker = (exports as unknown as { default: { fetch(request: Request): Promise<Response> } }).default;
const BASE = "http://app.test";
const route = (input: string, init?: RequestInit) => worker.fetch(new Request(input, init));

const seed = (address: string, extra: Partial<Seed> = {}): Seed => ({
  workspace: { address, name: address },
  endpoint: { label: "coworker-fake-model", baseUrl: FAKE_ENDPOINT },
  manager: { name: "Launch", address: "launch" },
  allow: { emails: ["Ama@Acme.test"], githubIds: ["5001"] },
  ...extra,
});

async function signedIn(owner: string): Promise<Session> {
  const session = await liveApp.signIn({
    baseUrl: BASE,
    fetch: route,
    email: owner,
    name: "Live runner",
    obtainLink: async (request) => {
      await request();
      return /https?:\/\/\S+/u.exec(outbox.lastTo(owner)?.text ?? "")?.[0];
    },
  });
  if (isFailed(session)) throw new Error(session.reason);
  return session;
}

const made = async (session: Session, input: Seed): Promise<Provisioned> => {
  const result = await liveApp.provision(session, input);
  if (isFailed(result)) throw new Error(result.reason);
  return result;
};

describe("the live runner's client of the app", () => {
  it("signs in through the emailed link, and sets the workspace up the same way every time", async () => {
    const session = await signedIn("owner-one@example.test");
    const first = await made(session, seed("liveone"));
    const again = await made(await signedIn("owner-one@example.test"), seed("liveone"));
    expect(again.workspace).toBe(first.workspace);
    expect(again.manager.managerId).toBe(first.manager.managerId);
    const listed = await session.json<{ workspaces: { address: string }[] }>("GET", "/api/workspaces");
    expect(listed.workspaces.filter(({ address }) => address === "liveone")).toHaveLength(1);
    expect((await session.json<{ managers: unknown[] }>("GET", `${first.workspace}/managers`)).managers).toHaveLength(1);
    const keys = await session.json<{ connections: { baseUrl: string }[] }>("GET", `${first.workspace}/models`);
    expect(keys.connections.filter(({ baseUrl }) => baseUrl === FAKE_ENDPOINT)).toHaveLength(1);
    const { policy } = await session.json<{ policy: { allowed: { handle: { kind: string; id: string } }[] } }>(
      "GET",
      `${first.base}/policy`,
    );
    expect(policy.allowed.map(({ handle }) => `${handle.kind}:${handle.id}`)).toEqual(["email:ama@acme.test", "github:5001"]);
  }, 60_000);

  it("says what to do when the repo cannot be heard yet, and hears it once the App is installed", async () => {
    const session = await signedIn("owner-two@example.test");
    const noApp = await liveApp.provision(session, seed("livetwo", { repo: "acme/livetwo" }));
    expect(isFailed(noApp) && noApp.reason).toContain("install it from Settings, Keys and connections");
    const first = await made(session, seed("livetwo"));
    const team: Team = {
      owner: { cookie: "", send: session.send },
      workspace: first.workspace,
      base: first.base,
      manager: first.manager,
    };
    expect((await installed(team, 9201, ["acme/livetwo"])).status).toBe(200);
    const heard = await made(session, seed("livetwo", { repo: "acme/livetwo", environment: "app" }));
    expect(heard.github.sources.map(({ repo, events }) => [repo, events])).toEqual([["acme/livetwo", ["issues", "issue_comment"]]]);
    // Again: no second environment and nothing changes.
    await made(session, seed("livetwo", { repo: "acme/livetwo", environment: "app" }));
    const { environments } = await session.json<{ environments: { name: string; usedBy: string[] }[] }>(
      "GET",
      `${first.workspace}/environments`,
    );
    expect(environments).toEqual([expect.objectContaining({ name: "app", usedBy: ["Worker"] })]);
  }, 60_000);

  it("sees an allowed person's mail become a task and a stranger's make none and one line in Events", async () => {
    const session = await signedIn("owner-three@example.test");
    const live = await made(session, seed("livethree"));
    const mailTo = (from: string, subject: string, id: string) =>
      mail(live.manager.address, { from, to: live.manager.address, subject, text: "Please", messageId: `<${id}@acme.test>` });
    await mailTo("ama@acme.test", "DT live allowed", "live-1");
    const board = await eventually(
      () => liveApp.board(session, live),
      ({ tasks }) => tasks.length === 1,
    );
    expect(board.tasks.map(({ title }) => title)).toEqual(["DT live allowed"]);
    await mailTo("stranger@elsewhere.test", "DT live stranger", "live-2");
    const lines = await eventually(
      async () => (await liveApp.events(session, live)).map(({ line }) => line),
      (found) => found.some((line) => line.includes("“DT live stranger”")),
    );
    expect(lines.filter((line) => line.includes("“DT live stranger”"))).toHaveLength(1);
    expect((await liveApp.board(session, live)).tasks.map(({ title }) => title)).toEqual(["DT live allowed"]);
  }, 60_000);
});
