import type { Person } from "~/modules/protocol/types.ts";
import type { Account } from "../types.ts";

const isPerson = (value: unknown): value is Person =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string" &&
  "name" in value &&
  typeof value.name === "string";

/** The account over this server's `/api/me` and Better Auth's email-link sign-in. */
export function createAccount(send: (path: string, init?: RequestInit) => Promise<Response>): Account {
  return {
    me: async () => {
      try {
        const body: unknown = await (await send("/api/me")).json();
        const person = typeof body === "object" && body !== null && "person" in body ? body.person : undefined;
        return isPerson(person) ? person : undefined;
      } catch {
        return undefined;
      }
    },
    sendLink: async (email, returnTo) => {
      try {
        const response = await send("/api/auth/sign-in/magic-link", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, callbackURL: returnTo }),
        });
        return response.ok;
      } catch {
        return false;
      }
    },
  };
}
