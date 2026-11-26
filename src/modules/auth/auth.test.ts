import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { fakeMailer } from "~/modules/mail/testing.ts";
import { outsideCode, type OutsidePerson } from "./testing.ts";
import { createAuth } from "./service.ts";
import type { Auth } from "./types.ts";

const { AUTH } = env as unknown as { AUTH: D1Database };
const APP = "http://app.test";

function world() {
  const mailer = fakeMailer();
  const auth = createAuth({
    now: Date.now,
    database: AUTH,
    mailer,
    settings: {
      baseUrl: APP,
      secret: "test-secret-that-is-at-least-32-characters-long",
      sendFrom: "hello@app.test",
      google: { clientId: "google-client", clientSecret: "google-secret" },
      github: { clientId: "github-client", clientSecret: "github-secret" },
    },
  });
  return { auth, mailer };
}

const cookiesOf = (response: Response): string =>
  response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");

const post = (auth: Auth, path: string, body: unknown, cookie = ""): Promise<Response> =>
  auth.handle(
    new Request(`${APP}/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: APP, cookie },
      body: JSON.stringify(body),
    }),
  );

async function signInWith(auth: Auth, provider: "google" | "github", person: OutsidePerson): Promise<string> {
  const started = await post(auth, "/sign-in/social", { provider, callbackURL: "/" });
  const { url } = (await started.json()) as { url: string };
  const state = new URL(url).searchParams.get("state") ?? "";
  const callback = new URL(`${APP}/api/auth/callback/${provider}`);
  callback.searchParams.set("code", outsideCode(person));
  callback.searchParams.set("state", state);
  const back = await auth.handle(new Request(callback, { headers: { cookie: cookiesOf(started) }, redirect: "manual" }));
  expect(back.status).toBe(302);
  return cookiesOf(back);
}

/** Every source file, as text. Vite reads them at build time, so the test needs no file system. */
const sources = import.meta.glob(["/src/**/*.{ts,tsx}", "/test/**/*.{ts,tsx}", "/e2e/**/*.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
});

describe("auth", () => {
  it("acc:auth/tailscale-gone", () => {
    const files = Object.entries(sources as Record<string, string>);
    expect(files.length).toBeGreaterThan(50);
    const tailscale = "Tailscale" + "-User";
    // Tests may still send the header, to show it is ignored; no code may read it.
    const code = files.filter(([path]) => !/\.test\.tsx?$/u.test(path));
    expect(code.filter(([, text]) => text.includes(tailscale)).map(([path]) => path)).toEqual([]);
    expect(files.filter(([path]) => /\/modules\/(identity|visitor)\//u.test(path)).map(([path]) => path)).toEqual([]);
    const imports = files.filter(([, text]) => /~\/modules\/(identity|visitor)\//u.test(text)).map(([path]) => path);
    expect(imports).toEqual([]);
  });

  it("acc:auth/sign-up", async () => {
    const { auth, mailer } = world();
    const asked = await post(auth, "/sign-in/magic-link", { email: "ada@example.test", name: "Ada", callbackURL: "/" });
    expect(asked.status).toBe(200);
    const mail = mailer.lastTo("ada@example.test");
    expect(mail?.subject).toBe("Your sign-in link");
    const link = /https?:\/\/\S+/u.exec(mail?.text ?? "")?.[0] ?? "";
    const verified = await auth.handle(new Request(link, { redirect: "manual" }));
    const session = await auth.signedIn(new Headers({ cookie: cookiesOf(verified) }));
    expect(session).toMatchObject({ email: "ada@example.test", name: "Ada" });
    expect(await auth.signedIn(new Headers())).toBeUndefined();
  });

  it("says when the sign-in email could not be sent", async () => {
    const { auth, mailer } = world();
    mailer.failWith("down");
    const asked = await post(auth, "/sign-in/magic-link", { email: "ada@example.test", callbackURL: "/" });
    expect([asked.status, await asked.json()]).toEqual([
      502,
      expect.objectContaining({ message: expect.stringContaining("could not be sent") }),
    ]);
  });

  it("acc:auth/google-github", async () => {
    const { auth } = world();
    const grace = { id: "4242", email: "grace@example.test", name: "Grace Hopper" };
    const viaGoogle = await auth.signedIn(new Headers({ cookie: await signInWith(auth, "google", grace) }));
    const viaGitHub = await auth.signedIn(new Headers({ cookie: await signInWith(auth, "github", grace) }));
    expect(viaGoogle?.userId).toBeDefined();
    expect(viaGitHub?.userId).toBe(viaGoogle?.userId);
    const accounts = await auth.accounts(viaGoogle?.userId ?? "");
    expect(accounts.map((account) => account.providerId).sort()).toEqual(["github", "google"]);
  });

  it("refuses to create or delete an organization from outside", async () => {
    const { auth } = world();
    expect((await post(auth, "/organization/create", { name: "x", slug: "x" })).status).toBe(404);
    expect((await post(auth, "/organization/delete", { organizationId: "x" })).status).toBe(404);
  });
});
