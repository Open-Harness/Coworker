import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { outsideCode } from "~/modules/auth/testing.ts";
import { outbox } from "~/modules/mail/testing.ts";
import type { PersonHandles } from "~/modules/workspace/types.ts";
import { addressOf, events, mail } from "../../test/email.ts";
import { deliver, hears, installed, on } from "../../test/github.ts";
import { APP, type Browser, json } from "../../test/flows.ts";
import { team } from "../../test/team.ts";

const worker = (exports as unknown as { default: { fetch(request: Request): Promise<Response> } }).default;
const cookiesOf = (response: Response): string[] => response.headers.getSetCookie().map((cookie) => cookie.split(";")[0] ?? "");

/** Better Auth's own flow for linking an account to the person signed in, against the fake GitHub sign-in. */
async function linkGitHub(person: Browser, outside: { id: string; email: string; name: string }): Promise<number> {
  const started = await person.send("POST", "/api/auth/link-social", { provider: "github", callbackURL: "/" });
  const body = await json<{ url: string }>(started);
  if (typeof body.url !== "string") throw new Error(`link-social answered ${started.status}: ${JSON.stringify(body)}`);
  const { url } = body;
  const callback = new URL(`${APP}/api/auth/callback/github`);
  callback.searchParams.set("code", outsideCode(outside));
  callback.searchParams.set("state", new URL(url).searchParams.get("state") ?? "");
  const cookie = [person.cookie, ...cookiesOf(started)].filter((part) => part !== "").join("; ");
  return (await worker.fetch(new Request(callback, { headers: { cookie }, redirect: "manual" }))).status;
}

const peopleOf = async (launch: Awaited<ReturnType<typeof team>>): Promise<readonly PersonHandles[]> =>
  (await json<{ people: PersonHandles[] }>(await launch.owner.send("GET", `${launch.workspace}/people`))).people;

describe("people and handles", () => {
  it("flw:people/handles", async () => {
    const launch = await team("handles");
    const ama = "email:handles@example.test";
    // The manager may be asked by Ama, the Person: every Handle she has, now and later.
    await launch.owner.send("PUT", `${launch.base}/policy`, { acceptMode: "observe", allowed: [{ kind: "person", person: ama }] });

    // Linking GitHub by signing in with it adds a signed-in Handle on GitHub's numeric id.
    expect(await linkGitHub(launch.owner, { id: "7777", email: "handles@example.test", name: "Ama" })).toBe(302);
    // Another address, proven by a link mailed to it.
    expect((await launch.owner.send("POST", "/api/me/emails", { email: "Ama@Acme-Mail.test" })).status).toBe(202);
    const link = /https?:\/\/\S+/u.exec(outbox.lastTo("ama@acme-mail.test")?.text ?? "")?.[0] ?? "";
    expect((await launch.owner.send("GET", new URL(link).pathname + new URL(link).search)).status).toBe(200);
    // An Owner vouches for a Slack user; nobody else can.
    const slack = { person: ama, kind: "slack", space: "T01ACME", id: "U02ABC", display: "@ama" };
    expect((await launch.owner.send("POST", `${launch.workspace}/people/handles`, slack)).status).toBe(200);

    const handles = (await peopleOf(launch)).find(({ person }) => person === ama)?.handles ?? [];
    expect(handles).toEqual(
      expect.arrayContaining([
        { kind: "github", id: "7777", proof: "signed_in" },
        { kind: "email", id: "ama@acme-mail.test", proof: "signed_in" },
        { kind: "slack", space: "T01ACME", id: "U02ABC", display: "@ama", proof: "added" },
      ]),
    );

    // The Gate knows her by GitHub's id, whatever her login says; the same login on another id is a stranger.
    await installed(launch, 7201, ["acme/handles"]);
    await hears(launch, [{ repo: "acme/handles" }]);
    const issue = (id: number, number: number) =>
      on(7201, "acme/handles", { id, login: "ama-real", type: "User" }, "issues", "opened", {
        issue: { number, title: `Ask ${number}`, body: "@launch please" },
      });
    await deliver("issues", issue(7777, 1));
    await deliver("issues", issue(7778, 2));
    // Her second address counts when DKIM passes, and is nobody when it does not.
    const from = (dkim: boolean, id: string) => ({
      from: "ama@acme-mail.test",
      to: addressOf(launch),
      subject: `Mail ${id}`,
      text: "Hello",
      messageId: `<${id}@acme-mail.test>`,
      dkim,
    });
    await mail(addressOf(launch), from(true, "good"));
    await mail(addressOf(launch), from(false, "forged"));
    const lines = (await events(launch)).map(({ line }) => line);
    expect(lines).toContain("github from ama-real: “Ask 1” → explicit candidate");
    expect(lines).toContain("github from ama-real: “Ask 2” → ignored: The sender is not on the allowed list");
    expect(lines).toContain("email from ama@acme-mail.test: “Mail good” → explicit candidate");
    expect(lines).toContain("email from ama@acme-mail.test: “Mail forged” → ignored: The sender could not be verified");
  });
});
