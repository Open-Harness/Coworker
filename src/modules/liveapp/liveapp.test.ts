import { describe, expect, it } from "vitest";
import { isFailed, liveApp, type Fetch } from "./service.ts";

const BASE = "https://staging.example.test";

/** A fetch that answers from a table of `METHOD path`, recording each call's cookie and origin. */
function scripted(answers: Record<string, () => Response>) {
  const calls: { key: string; cookie: string | null; origin: string | null }[] = [];
  const fetch: Fetch = async (input, init) => {
    const url = new URL(input);
    const headers = new Headers(init?.headers);
    const key = `${init?.method ?? "GET"} ${url.pathname}`;
    calls.push({ key, cookie: headers.get("cookie"), origin: headers.get("origin") });
    return answers[key]?.() ?? new Response("{}", { status: 404 });
  };
  return { fetch, calls };
}

const signedIn = () => new Response(null, { status: 302, headers: { "set-cookie": "session=abc123; Path=/; HttpOnly", location: "/" } });

describe("signing in", () => {
  it("follows the emailed link and sends the session cookie and the app's origin from then on", async () => {
    const { fetch, calls } = scripted({
      "POST /api/auth/sign-in/magic-link": () => Response.json({ status: true }),
      "GET /api/auth/magic-link/verify": signedIn,
      "GET /api/workspaces": () => Response.json({ workspaces: [] }),
    });
    const session = await liveApp.signIn({
      baseUrl: BASE,
      fetch,
      email: "owner@example.test",
      name: "Live runner",
      obtainLink: async (request) => {
        expect((await request()).ok).toBe(true);
        return `${BASE}/api/auth/magic-link/verify?token=t`;
      },
    });
    expect(isFailed(session)).toBe(false);
    expect(calls[0]).toMatchObject({ key: "POST /api/auth/sign-in/magic-link", origin: BASE });
    expect(calls.at(-1)).toMatchObject({ key: "GET /api/workspaces", cookie: "session=abc123", origin: BASE });
  });

  it("says so when no link arrives, or the link gives no session", async () => {
    const none = await liveApp.signIn({
      baseUrl: BASE,
      fetch: scripted({}).fetch,
      email: "owner@example.test",
      name: "x",
      obtainLink: async () => undefined,
    });
    expect(isFailed(none) && none.reason).toBe("No sign-in link reached owner@example.test");
    const { fetch } = scripted({ "GET /api/auth/magic-link/verify": () => new Response(null, { status: 302 }) });
    const noSession = await liveApp.signIn({
      baseUrl: BASE,
      fetch,
      email: "owner@example.test",
      name: "x",
      obtainLink: async () => `${BASE}/api/auth/magic-link/verify`,
    });
    expect(isFailed(noSession) && noSession.reason).toContain("did not give a session");
  });
});
