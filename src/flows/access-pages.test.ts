import { describe, expect, it } from "vitest";
import { builder } from "../../test/roles.ts";
import { team } from "../../test/team.ts";

describe("which pages the server answers", () => {
  it("answers a Builder with the build pages and keeps the workspace's settings to Owners", async () => {
    const launch = await team("accessbuilder");
    const bo = await builder(launch, "accessbuilder-bo@example.test", "Bo");
    const status = async (path: string) => (await bo.send("GET", path)).status;
    expect(await Promise.all([`${launch.workspace}/environments`, `${launch.workspace}/agents`].map(status))).toEqual([200, 200]);
    expect(
      await Promise.all([`${launch.workspace}/usage`, `${launch.workspace}/billing`, `${launch.workspace}/audit`].map(status)),
    ).toEqual([403, 403, 403]);
  });
});
