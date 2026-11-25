import { describe, expect, it } from "vitest";
import { appApi } from "./service.ts";

interface Scripted {
  /** The repos the installation reaches. */
  readonly repos: readonly string[];
  /** The ones the person who signed in administers; they see the others too. */
  readonly admin: readonly string[];
  readonly exchange?: Response;
  /** The address whose second page fails. */
  readonly breaks?: string;
}

async function pem(): Promise<string> {
  const pair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const der = new Uint8Array((await crypto.subtle.exportKey("pkcs8", pair.privateKey)) as ArrayBuffer);
  return `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...der))}\n-----END PRIVATE KEY-----`;
}

/** The App against a GitHub that answers as scripted, keeping what it was asked. */
async function app({ repos, admin, exchange, breaks }: Scripted) {
  const asked: Request[] = [];
  const list = (url: URL) => {
    const page = Number(url.searchParams.get("page"));
    if (page > 1 && breaks === url.pathname) return Response.json({ message: "Server error" }, { status: 500 });
    const shown = repos.slice((page - 1) * 100, page * 100);
    const repositories = shown.map((name) => ({ full_name: name, permissions: { admin: admin.includes(name), pull: true } }));
    return Response.json({ total_count: repos.length, repositories });
  };
  const github = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = new Request(input, init);
    asked.push(new Request(input, init));
    const url = new URL(request.url);
    if (url.pathname === "/login/oauth/access_token") return exchange ?? Response.json({ access_token: "ghu_person" });
    if (url.pathname.endsWith("/access_tokens")) return Response.json({ token: "ghs_app" }, { status: 201 });
    if (url.pathname.endsWith("/repositories")) return list(url);
    return url.pathname === "/app/installations/7" ? Response.json({ account: { login: "acme" } }) : Response.json({}, { status: 404 });
  };
  const client = { clientId: "Iv1.app", clientSecret: "app-secret" };
  const api = appApi({ appId: "123", slug: "dt", privateKey: await pem(), client, fetch: github, now: () => 1_800_000_000_000 });
  return { api, asked };
}

const many = Array.from({ length: 101 }, (_, index) => `acme/r${index}`);

describe("claiming an installation", () => {
  it("is for someone who administers every repo it reaches", async () => {
    const { api, asked } = await app({ repos: ["acme/api", "acme/web"], admin: ["acme/api", "acme/web"] });
    expect(await api.claim(7, "c1")).toEqual({
      _tag: "Claimed",
      installation: { id: 7, account: "acme", repos: ["acme/api", "acme/web"] },
    });
    const exchange = asked.find(({ url }) => url === "https://github.com/login/oauth/access_token");
    expect(await exchange?.json()).toEqual({ client_id: "Iv1.app", client_secret: "app-secret", code: "c1" });
    expect(asked.filter(({ url }) => url.includes("app-secret") || url.includes("ghu_person"))).toEqual([]);
  });

  it("is not for someone who only reads its repos, or administers some of them", async () => {
    for (const admin of [[], ["acme/api"]]) {
      const { api } = await app({ repos: ["acme/api", "acme/web"], admin });
      expect(await api.claim(7, "c1")).toEqual({ _tag: "NotYours" });
    }
  });

  it("looks past the first page, and takes no part for the whole", async () => {
    expect((await (await app({ repos: many, admin: many })).api.claim(7, "c1"))._tag).toBe("Claimed");
    expect((await (await app({ repos: many, admin: many.slice(0, 100) })).api.claim(7, "c1"))._tag).toBe("NotYours");
    for (const breaks of ["/installation/repositories", "/user/installations/7/repositories"])
      expect((await (await app({ repos: many, admin: many, breaks })).api.claim(7, "c1"))._tag).toBe("NotYours");
  });

  it("says the same of an installation that does not exist, or reaches nothing", async () => {
    expect(await (await app({ repos: ["acme/api"], admin: ["acme/api"] })).api.claim(8, "c1")).toEqual({ _tag: "NotYours" });
    expect(await (await app({ repos: [], admin: [] })).api.claim(7, "c1")).toEqual({ _tag: "NotYours" });
  });

  it("takes no code GitHub does not take", async () => {
    const refused = { repos: ["acme/api"], admin: ["acme/api"], exchange: Response.json({ error: "bad_verification_code" }) };
    expect(await (await app(refused)).api.claim(7, "old")).toEqual({ _tag: "NotSignedIn" });
  });

  it("cannot happen, or be started, without the App's sign-in client", async () => {
    const api = appApi({ appId: "1", slug: "dt", privateKey: await pem(), fetch: async () => Response.json({}), now: () => 0 });
    expect(api.installUrl("w~~t")).toBeUndefined();
    expect(await api.claim(7, "c1")).toEqual({ _tag: "NotSignedIn" });
  });
});
