import { each, isRecord, textOf, wordsOf } from "~/modules/team-core/service.ts";
import type { Json, Server } from "~/modules/team-core/types.ts";
import type { AccountApi, SignInData, SignInWay } from "../types.ts";

/* A person's own account: their name, what they sign in with, and where they are signed in. Better Auth's routes. */

const done = (): true => true;
const isWay = (value: unknown): value is SignInWay => value === "google" || value === "github";
const timeOf = (value: unknown): number => (typeof value === "string" ? Date.parse(value) || 0 : 0);

function session(row: Json): Omit<SignInData, "isThis"> | undefined {
  if (typeof row["id"] !== "string" || typeof row["token"] !== "string") return undefined;
  return { id: row["id"], token: row["token"], device: deviceOf(textOf(row["userAgent"])), at: timeOf(row["updatedAt"]) };
}

const BROWSERS = [/Edg\//u, /Firefox\//u, /Chrome\//u, /Safari\//u] as const;
const BROWSER_NAMES = ["Edge", "Firefox", "Chrome", "Safari"] as const;
const SYSTEMS = [
  [/iPhone|iPad/u, "iOS"],
  [/Android/u, "Android"],
  [/Mac OS X/u, "macOS"],
  [/Windows/u, "Windows"],
  [/Linux/u, "Linux"],
] as const;

/** "Chrome on macOS", from what the browser calls itself. */
export function deviceOf(userAgent: string): string {
  const browser = BROWSER_NAMES[BROWSERS.findIndex((pattern) => pattern.test(userAgent))];
  const system = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1];
  if (browser === undefined) return system ?? "A browser";
  return system === undefined ? browser : `${browser} on ${system}`;
}

export function createAccountApi({ read, write }: Server): AccountApi {
  return {
    saveName: (name) => write("POST", "/api/auth/update-user", { name }, done),
    ways: () => read("/api/sign-in", (body) => (isRecord(body) && Array.isArray(body["ways"]) ? body["ways"].filter(isWay) : undefined)),
    linked: () =>
      read("/api/auth/list-accounts", (body) =>
        Array.isArray(body) ? each(body, (row) => (isWay(row["providerId"]) ? row["providerId"] : undefined)) : undefined,
      ),
    link: (provider, returnTo) =>
      write("POST", "/api/auth/link-social", { provider, callbackURL: returnTo, disableRedirect: true }, (body) =>
        isRecord(body) ? wordsOf(body["url"]) : undefined,
      ),
    addEmail: (email) => write("POST", "/api/me/emails", { email }, done),
    signIns: async () => {
      const [all, current] = await Promise.all([
        read("/api/auth/list-sessions", (body) => (Array.isArray(body) ? each(body, session) : undefined)),
        read("/api/auth/get-session", (body) =>
          isRecord(body) && isRecord(body["session"]) ? { id: textOf(body["session"]["id"]) } : undefined,
        ),
      ]);
      if (all._tag === "Failed") return all;
      const here = current._tag === "Loaded" ? current.value.id : "";
      const rows = all.value.map((row): SignInData => ({ ...row, isThis: row.id === here }));
      return { _tag: "Loaded", value: rows.toSorted((one, other) => Number(other.isThis) - Number(one.isThis) || other.at - one.at) };
    },
    signOutOf: (token) => write("POST", "/api/auth/revoke-session", { token }, done),
    signOutElsewhere: () => write("POST", "/api/auth/revoke-other-sessions", {}, done),
  };
}
