import { isOurs, isPrivateName, isPrivateV4, isPrivateV6 } from "./host.ts";

/** Why this address is not allowed, or null when it is. */
export function mayBe(url: string): string | null {
  const parsed = parse(url.trim());
  if (parsed === null) return "That is not a web address.";
  if (parsed.protocol !== "https:") return "An MCP server has to be reached over https.";
  const host = parsed.hostname.endsWith(".") ? parsed.hostname.slice(0, -1) : parsed.hostname;
  if (host === "") return "That address has no host.";
  if (host.startsWith("[")) return isPrivateV6(host) ? "That is a private address." : null;
  if (isPrivateV4(host) || isPrivateName(host)) return "That is a private address, and it is never reached.";
  if (isOurs(host)) return "That is one of our own addresses, and it is never reached.";
  return null;
}

function parse(text: string): URL | null {
  try {
    return new URL(text);
  } catch {
    return null;
  }
}
