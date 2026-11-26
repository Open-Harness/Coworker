import { sign } from "@octokit/webhooks-methods";
import { describe, expect, it } from "vitest";
import { example } from "../../../test/github.ts";
import { githubConnector } from "./service.ts";

const us = async () => ({ login: "juno-test[bot]", mention: "@juno-test", label: "juno" });
const SECRET = "a-secret";

async function delivery(secret: string, event: string, payload: object) {
  const body = JSON.stringify(payload);
  return { headers: { "x-github-event": event, "x-hub-signature-256": await sign(secret, body) }, body };
}

describe("github-connector", () => {
  it("refuses what is not signed, and asks who we are only after the signature held", async () => {
    let asked = 0;
    const heard = await githubConnector.receive(
      await delivery("another", "issues", example("issues", "opened")),
      SECRET,
      async () => (asked++, us()),
    );
    expect(heard).toMatchObject({ _tag: "Refused", why: "not signed" });
    expect(asked).toBe(0);
    expect(await githubConnector.receive({ headers: {}, body: "{}" }, SECRET, us)).toMatchObject({ _tag: "Refused", why: "not signed" });
  });

  it("makes one item of an issue, from the repo, in its own conversation", async () => {
    const payload = example("issues", "opened");
    const heard = await githubConnector.receive(await delivery(SECRET, "issues", payload), SECRET, us);
    if (heard._tag !== "Item") throw new Error(`Heard ${heard._tag}`);
    expect(heard.item).toMatchObject({ by: "event", account: "github", place: (payload["repository"] as { full_name: string }).full_name });
    expect(heard.item.thread).toMatch(/^github:.+#\d+$/u);
    const again = await githubConnector.receive(await delivery(SECRET, "issues", payload), SECRET, us);
    expect(again._tag === "Item" && again.item.same).toBe(heard.item.same);
  });

  it("says something broken is broken", async () => {
    expect(await githubConnector.receive(await delivery(SECRET, "issues", { nothing: true }), SECRET, us)).toMatchObject({
      _tag: expect.stringMatching(/Refused|Noise/u),
    });
  });
});
