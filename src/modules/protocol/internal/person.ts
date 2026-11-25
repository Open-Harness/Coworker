import type { Person } from "../types.ts";

export const MAX_NAME_CHARACTERS = 48;
const CONTROL_CHARACTERS = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu;

/** A display name that cannot break the `[name]` attribution line the model sees. Empty when nothing usable is left. */
export const normalizeName = (value: string): string =>
  [...value.normalize("NFC").replace(CONTROL_CHARACTERS, " ").replace(/[[\]]/gu, "").replace(/\s+/gu, " ").trim()]
    .slice(0, MAX_NAME_CHARACTERS)
    .join("")
    .trim();

/** The person a signed-in account appears as: `email:<address>`, with the account's name. */
export function personOf(account: { readonly email: string; readonly name: string; readonly image?: string }): Person {
  const email = account.email.trim().toLowerCase();
  const name = normalizeName(account.name) || normalizeName(email.split("@")[0] ?? "") || "Someone";
  const avatarUrl =
    account.image !== undefined && URL.canParse(account.image) && new URL(account.image).protocol === "https:" ? account.image : undefined;
  return { id: `email:${email}`, name, ...(avatarUrl === undefined ? {} : { avatarUrl }) };
}

/** Carries a person from the Worker to a Durable Object. The Worker sets it on every request it forwards. */
export const PERSON_HEADER = "X-Pi-Exp-Person";

export const encodePerson = (person: Person): string => encodeURIComponent(JSON.stringify(person));

export function decodePerson(header: string | null): Person | undefined {
  if (header === null) return undefined;
  try {
    const value: unknown = JSON.parse(decodeURIComponent(header));
    if (typeof value !== "object" || value === null || !("id" in value) || !("name" in value)) return undefined;
    const { id, name } = value;
    if (typeof id !== "string" || typeof name !== "string") return undefined;
    const avatarUrl = "avatarUrl" in value && typeof value.avatarUrl === "string" ? value.avatarUrl : undefined;
    return { id, name, ...(avatarUrl === undefined ? {} : { avatarUrl }) };
  } catch {
    return undefined;
  }
}
