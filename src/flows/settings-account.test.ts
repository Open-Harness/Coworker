import { describe, expect, it } from "vitest";
import { json, signUp } from "../../test/flows.ts";
import { member, team } from "../../test/team.ts";

/** What the Profile screen asks of Better Auth directly: the name, and where the person is signed in. */
describe("a person's own account", () => {
  it("changes their name, which a workspace then shows, and signs out every other session", async () => {
    const launch = await team("account");
    const bo = await member(launch, "account-bo@example.test", "Bo");
    expect((await bo.send("POST", "/api/auth/update-user", { name: "Bo Chen" })).status).toBe(200);
    expect(await json(await bo.send("GET", "/api/me"))).toMatchObject({ person: { name: "Bo Chen" } });
    const me = await json<{ person: { name: string } }>(await bo.send("GET", `${launch.workspace}/me`));
    expect(me.person.name).toBe("Bo Chen");

    const again = await signUp("account-bo@example.test", "Bo");
    const sessions = async () => json<readonly { id: string }[]>(await bo.send("GET", "/api/auth/list-sessions"));
    expect((await sessions()).length).toBeGreaterThanOrEqual(2);
    expect((await bo.send("POST", "/api/auth/revoke-other-sessions", {})).status).toBe(200);
    expect(await sessions()).toHaveLength(1);
    expect((await again.send("GET", "/api/auth/get-session")).status).toBe(200);
    expect(await json(await again.send("GET", "/api/me"))).toEqual({ person: null });
  });
});
