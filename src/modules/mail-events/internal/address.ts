import type { Address as Parsed } from "postal-mime";
import type { Address, Us } from "../types.ts";

/** The mailboxes of an address list, with groups opened, lowercased, each once. */
export function mailboxes(list: readonly Parsed[] | undefined): readonly Address[] {
  const all = (list ?? []).flatMap((one) => (one.group === undefined ? [one] : one.group));
  const seen = new Set<string>();
  const out: Address[] = [];
  for (const { address, name } of all) {
    const lower = (address ?? "").trim().toLowerCase();
    if (lower === "" || seen.has(lower)) continue;
    seen.add(lower);
    out.push({ address: lower, name: name.trim() });
  }
  return out;
}

export function isOurs(address: string, us: Us): boolean {
  const lower = address.trim().toLowerCase();
  return us.addresses.some((one) => one.trim().toLowerCase() === lower);
}

/** `<a@b>` ids in the order they are written, each once. */
export function ids(value: string | undefined): readonly string[] {
  return [...new Set(value?.match(/<[^<>\s]+>/gu) ?? [])];
}

export function domainOf(address: string): string {
  return address.slice(address.lastIndexOf("@") + 1).toLowerCase();
}
