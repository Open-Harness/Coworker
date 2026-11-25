/*
 * A short token that names an account, signed with the auth secret for one purpose. Nothing is stored: the signature
 * is the record, and it lasts an hour. A token made for one purpose or one account is no good for another.
 */

const HOUR = 3_600_000;
const encoder = new TextEncoder();
const base64url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_")
    .replace(/=+$/u, "");
const bytesOf = (text: string): Uint8Array =>
  Uint8Array.from(atob(text.replace(/-/gu, "+").replace(/_/gu, "/")), (char) => char.charCodeAt(0));

export type Purpose = "email-proof" | "github-install";

async function signature(secret: string, purpose: Purpose, body: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(`${purpose}:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(body))));
}

/** Constant time, so a guess learns nothing from how long the answer took. */
const same = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
};

export async function sealed(secret: string, purpose: Purpose, userId: string, text: string, now: number): Promise<string> {
  const body = base64url(encoder.encode(JSON.stringify({ u: userId, e: text, x: now + HOUR })));
  return `${body}.${await signature(secret, purpose, body)}`;
}

/** The text in the token, if it is good, unexpired, made for this purpose and for this account. */
export async function unsealed(secret: string, purpose: Purpose, userId: string, token: string, now: number): Promise<string | undefined> {
  const [body = "", signed = ""] = token.split(".");
  if (!same(signed, await signature(secret, purpose, body))) return undefined;
  try {
    const claims = JSON.parse(new TextDecoder().decode(bytesOf(body))) as { u?: unknown; e?: unknown; x?: unknown };
    if (claims.u !== userId || typeof claims.e !== "string" || typeof claims.x !== "number" || claims.x < now) return undefined;
    return claims.e;
  } catch {
    return undefined;
  }
}
