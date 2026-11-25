import { sign } from "@octokit/webhooks-methods";
import { describe, expect, it } from "vitest";
import type { ReplyAddress, Trigger } from "~/modules/triggers/types.ts";
import { appApi, github } from "./service.ts";
import { fakeGitHub } from "./testing.ts";
import type { Hub } from "./types.ts";

const SECRET = "module-secret";
type FromGitHub = Extract<ReplyAddress, { kind: "github" }>;

/** The Source with one workspace whose manager hears `acme/api`, keeping what it was handed. */
function sourceWith(received: Trigger[]) {
  const hub: Hub = {
    gitHub: async () => ({ sources: [{ managerId: "m1", repo: "acme/api", events: ["pull_request"] }] }),
    managers: async () => [{ managerId: "m1", slug: "launch" }],
    receive: async (trigger) => (received.push(trigger), { _tag: "Candidate", strength: "explicit" }),
    logEvent: async () => undefined,
  };
  return github.source({
    secret: SECRET,
    appSlug: "co-worker",
    installations: { hubOf: async () => hub, removed: async () => undefined },
    now: () => 0,
  });
}

const pullRequest = (head: string, fork: boolean) => ({
  action: "opened",
  installation: { id: 7 },
  repository: { full_name: "acme/api" },
  sender: { id: 5001, login: "ama-gh", type: "User" },
  pull_request: {
    number: 4,
    title: "@launch faster export",
    body: "",
    head: { ref: "fast", repo: { full_name: head, fork } },
    base: { repo: { full_name: "acme/api" } },
  },
});

async function fromPullRequest(head: string, fork: boolean): Promise<FromGitHub> {
  const received: Trigger[] = [];
  const body = JSON.stringify(pullRequest(head, fork));
  await sourceWith(received).receive({ id: `d-${head}`, event: "pull_request", signature: await sign(SECRET, body), body });
  const replyTo = received[0]?.replyTo;
  if (replyTo?.kind !== "github") throw new Error("No GitHub Trigger");
  return replyTo;
}

const writes = (permissions: Readonly<Record<string, string>>): string[] =>
  Object.entries(permissions).flatMap(([name, level]) => (level === "write" ? [name] : []));

/** A PKCS #8 PEM key the scripted GitHub checks the App's JWT against. */
async function appKey() {
  const pair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const der = new Uint8Array((await crypto.subtle.exportKey("pkcs8", pair.privateKey)) as ArrayBuffer);
  const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...der))}\n-----END PRIVATE KEY-----`;
  return { pem, publicKey: pair.publicKey };
}

const decode = (part: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(part.replace(/-/gu, "+").replace(/_/gu, "/")), (char) => char.charCodeAt(0));

describe("github tokens", () => {
  it("flw:github/fork", async () => {
    const api = fakeGitHub(() => 0);
    api.install({ id: 7, account: "acme", repos: ["acme/api"] });
    const fromFork = await fromPullRequest("stranger/api", true);
    expect(fromFork.fork).toBe(true);
    const forked = await github.repoToken(api, fromFork);
    expect(forked._tag === "Token" ? writes(forked.token.permissions) : ["failed"]).toEqual([]);
    expect(writes(api.tokens[0]?.permissions ?? { asked: "write" })).toEqual([]);
    // The same pull request from a branch of the base repo may push.
    const fromBase = await fromPullRequest("acme/api", false);
    const based = await github.repoToken(api, fromBase);
    expect(based._tag === "Token" ? writes(based.token.permissions) : []).toContain("contents");
  });

  it("flw:github/token", async () => {
    const now = 1_800_000_000_000;
    const { pem, publicKey } = await appKey();
    const asked: { url: string; auth: string; body: unknown }[] = [];
    const scripted = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = new Request(input, init);
      asked.push({ url: request.url, auth: request.headers.get("authorization") ?? "", body: await request.json() });
      // GitHub offers more time than the platform will keep.
      return Response.json({ token: "ghs_minted", expires_at: new Date(now + 2 * 3_600_000).toISOString() }, { status: 201 });
    };
    const api = appApi({ appId: "123", privateKey: pem, fetch: scripted, now: () => now });
    const granted = await github.repoToken(api, { kind: "github", installation: 7, repo: "acme/api", number: 4, fork: false });
    if (granted._tag !== "Token") throw new Error(granted.reason);
    expect(granted.token.token).toBe("ghs_minted");
    expect(granted.token.repo).toBe("acme/api");
    expect(granted.token.expiresAt - now).toBeLessThanOrEqual(3_600_000);
    expect(JSON.stringify(granted)).not.toContain("PRIVATE KEY");
    // One repo, asked for with a short-lived JWT the App's key signed.
    expect(asked).toHaveLength(1);
    expect(asked[0]?.url).toBe("https://api.github.com/app/installations/7/access_tokens");
    expect(asked[0]?.body).toMatchObject({ repositories: ["api"] });
    const [head = "", claims = "", signature = ""] = (asked[0]?.auth ?? "").replace(/^Bearer /u, "").split(".");
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publicKey,
      decode(signature),
      new TextEncoder().encode(`${head}.${claims}`),
    );
    expect(valid).toBe(true);
    const { iss, exp } = JSON.parse(new TextDecoder().decode(decode(claims))) as { iss: string; exp: number };
    expect(iss).toBe("123");
    expect(exp * 1000 - now).toBeLessThanOrEqual(600_000);
  });
});
