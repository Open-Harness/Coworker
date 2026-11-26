import { describe, expect, it } from "vitest";
import { gitHubWorld } from "~/modules/github/testing.ts";
import { connection, installState } from "../../test/github.ts";
import { member, team } from "../../test/team.ts";

describe("connecting GitHub", () => {
  it("needs a code from someone who may give the installation", async () => {
    const launch = await team("ghclaim");
    const post = (body: object) => launch.owner.send("POST", `${launch.workspace}/github`, body);
    gitHubWorld.install({ id: 7301, account: "victim", repos: ["victim/secret"] });
    const state = await installState(launch);
    expect((await post({ installationId: 7301 })).status).toBe(400);
    expect((await post({ installationId: 7301, state })).status).toBe(400);
    expect((await post({ installationId: 7301, state, code: "made-up" })).status).toBe(400);
    // Signed in to GitHub for real, but as someone without that installation.
    expect((await post({ installationId: 7301, state, code: gitHubWorld.signIn(9) })).status).toBe(403);
    expect((await post({ installationId: 7301, state, code: gitHubWorld.signIn() })).status).toBe(403);
    expect((await connection(launch)).installation).toBeUndefined();
    // A code works once.
    const code = gitHubWorld.signIn(7301);
    expect((await post({ installationId: 7301, state, code })).status).toBe(200);
    expect((await post({ installationId: 7301, state, code })).status).toBe(400);
  });

  it("needs the state this Owner opened the install page with, for this workspace", async () => {
    const launch = await team("ghstate");
    const other = await team("ghstate2");
    gitHubWorld.install({ id: 7302, account: "acme", repos: ["acme/ghstate"] });
    const post = (state: string) =>
      launch.owner.send("POST", `${launch.workspace}/github`, { installationId: 7302, code: gitHubWorld.signIn(7302), state });
    const [workspace = "", manager = "", token = ""] = (await installState(launch)).split("~");
    // Someone else's, another workspace's, a changed one, and none.
    const theirs = await installState(other);
    const [, , theirToken = ""] = theirs.split("~");
    for (const state of [
      theirs,
      `${workspace}~${manager}~${theirToken}`,
      `${workspace}~m9~${token}`,
      `${workspace}~~${token}x`,
      `${workspace}~`,
      "",
    ])
      expect((await post(state)).status).toBe(400);
    expect((await connection(launch)).installation).toBeUndefined();
    expect((await post(`${workspace}~${manager}~${token}`)).status).toBe(200);
  });

  it("is an Owner's to do", async () => {
    const launch = await team("ghowner");
    gitHubWorld.install({ id: 7303, account: "acme", repos: ["acme/ghowner"] });
    const outsider = await team("ghowner2");
    const bo = await member(launch, "bo@ghowner.test", "Bo");
    const body = { installationId: 7303, code: gitHubWorld.signIn(7303), state: await installState(launch) };
    expect((await outsider.owner.send("POST", `${launch.workspace}/github`, body)).status).toBe(404);
    expect((await bo.send("POST", `${launch.workspace}/github`, body)).status).toBe(403);
    expect((await connection(launch)).installation).toBeUndefined();
  });
});
