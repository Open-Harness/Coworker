import type { CheckedUrl, Refusal, WebDependencies } from "../types.ts";
import { isAddress, isPublicAddress } from "./address.ts";

const PRIVATE_SUFFIXES = [".ts.net", ".local", ".localhost", ".internal", ".home.arpa", ".lan", ".corp", ".onion"];
const RESOLVER = "https://cloudflare-dns.com/dns-query";
const RESOLVE_TIMEOUT_MS = 5_000;
const RECORDS = [
  { type: "A", code: 1 },
  { type: "AAAA", code: 28 },
] as const;

const refuse = (reason: string): Refusal => ({ ok: false, reason });

/** What can be decided from the URL alone. The URL parser has already turned 0x7f.1 and friends into 127.0.0.1. */
export function checkUrl(text: string): CheckedUrl {
  if (!URL.canParse(text)) return refuse("It is not a URL");
  const url = new URL(text);
  if (url.protocol !== "https:" && url.protocol !== "http:") return refuse("Only http and https are allowed");
  if (url.username !== "" || url.password !== "") return refuse("URLs with credentials are not allowed");
  if (url.port !== "" && url.port !== "80" && url.port !== "443") return refuse("Only ports 80 and 443 are allowed");
  const host = url.hostname
    .replace(/^\[|\]$/gu, "")
    .replace(/\.$/u, "")
    .toLowerCase();
  if (isAddress(host)) return isPublicAddress(host) ? { ok: true, url } : refuse("The address is not public");
  if (!host.includes(".")) return refuse("The host name is not public");
  if (PRIVATE_SUFFIXES.some((suffix) => host.endsWith(suffix))) return refuse("The host name is not public");
  return { ok: true, url };
}

const answers = (body: unknown, code: number): string[] => {
  if (typeof body !== "object" || body === null || !("Answer" in body) || !Array.isArray(body.Answer)) return [];
  return body.Answer.flatMap((record: unknown) =>
    typeof record === "object" &&
    record !== null &&
    "type" in record &&
    record.type === code &&
    "data" in record &&
    typeof record.data === "string"
      ? [record.data]
      : [],
  );
};

async function resolve(host: string, fetcher: WebDependencies["fetch"]): Promise<readonly string[]> {
  const found = await Promise.all(
    RECORDS.map(async ({ type, code }) => {
      const response = await fetcher(`${RESOLVER}?name=${encodeURIComponent(host)}&type=${type}`, {
        headers: { Accept: "application/dns-json" },
        signal: AbortSignal.timeout(RESOLVE_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`The resolver answered ${response.status}`);
      const body: unknown = await response.json();
      return answers(body, code);
    }),
  );
  return found.flat();
}

/** Refuses names that point at a private address. It cannot pin the address the fetch then uses; see README. */
export async function checkResolved(text: string, fetcher: WebDependencies["fetch"]): Promise<CheckedUrl> {
  const checked = checkUrl(text);
  if (!checked.ok || isAddress(checked.url.hostname.replace(/^\[|\]$/gu, ""))) return checked;
  try {
    const addresses = await resolve(checked.url.hostname, fetcher);
    if (addresses.length === 0) return refuse("The host name does not resolve");
    return addresses.every(isPublicAddress) ? checked : refuse("The host name points at an address that is not public");
  } catch {
    return refuse("The host name could not be resolved");
  }
}
