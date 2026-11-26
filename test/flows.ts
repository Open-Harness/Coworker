import { env, exports } from "cloudflare:workers";
import { expect } from "vitest";
import type { Env } from "~/main.ts";
import { outbox } from "~/modules/mail/testing.ts";

/** Flow tests drive the whole Worker, as a browser on the app's own origin would. */
export const APP = "http://app.test";
export const bindings = env as unknown as Env;
const worker = (exports as unknown as { default: { fetch(request: Request): Promise<Response> } }).default;

const cookiesOf = (response: Response): string =>
  response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");

export interface Browser {
  readonly cookie: string;
  readonly send: (method: string, path: string, body?: unknown) => Promise<Response>;
}

export const browser = (cookie = ""): Browser => ({
  cookie,
  send: (method, path, body) =>
    worker.fetch(
      new Request(`${APP}${path}`, {
        method,
        redirect: "manual",
        headers: { origin: APP, cookie, ...(body === undefined ? {} : { "content-type": "application/json" }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    ),
});

/** Signs up through the email link the Worker sent to the fake outbox. */
export async function signUp(email: string, name: string): Promise<Browser> {
  const asked = await browser().send("POST", "/api/auth/sign-in/magic-link", { email, name, callbackURL: "/" });
  expect(asked.status).toBe(200);
  const link = /https?:\/\/\S+/u.exec(outbox.lastTo(email)?.text ?? "")?.[0] ?? "";
  const verified = await worker.fetch(new Request(link, { redirect: "manual" }));
  return browser(cookiesOf(verified));
}

export const json = async <T>(response: Response): Promise<T> => (await response.json()) as T;

/** Asks again until the answer passes, for work an object finishes after it answered. */
export async function eventually<T>(ask: () => Promise<T>, passes: (value: T) => boolean, timeoutMs = 5_000): Promise<T> {
  const until = Date.now() + timeoutMs;
  for (;;) {
    const value = await ask();
    if (passes(value) || Date.now() > until) return value;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
