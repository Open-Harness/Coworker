/** A workspace's address is what its managers' end in: `<manager>.<address>@co-worker.tech`. */
const SHAPE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/u;
const RESERVED = new Set(["www", "app", "api", "admin", "auth", "mail", "email", "sink", "staging", "status", "help", "docs", "join"]);

export type AddressCheck = { readonly ok: true; readonly address: string } | { readonly ok: false; readonly reason: string };

export function checkAddress(raw: string): AddressCheck {
  const address = raw.trim().toLowerCase();
  if (!SHAPE.test(address))
    return { ok: false, reason: "Use 3 to 30 letters, digits or dashes, starting and ending with a letter or digit" };
  if (address.includes("--")) return { ok: false, reason: "Use one dash at a time" };
  if (RESERVED.has(address)) return { ok: false, reason: "That address is reserved" };
  return { ok: true, address };
}
