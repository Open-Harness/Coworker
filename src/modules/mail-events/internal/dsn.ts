import type { Report } from "../types.ts";
import { whyNot } from "./why.ts";

/** `Name: value` lines of a block, folded lines joined; the first of a name wins. */
export function fieldsOf(block: string): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  let last = "";
  for (const line of block.split(/\r?\n/u)) {
    const field = /^([A-Za-z][A-Za-z0-9-]*):[ \t]*(.*)$/u.exec(line);
    if (field !== null) {
      last = (field[1] ?? "").toLowerCase();
      out[last] ??= (field[2] ?? "").trim();
    } else if (/^[ \t]+\S/u.test(line) && last !== "" && out[last] !== undefined) out[last] = `${out[last]} ${line.trim()}`;
    else last = "";
  }
  return out;
}

/** An address as a report writes it: after `rfc822;`, maybe in angle brackets. Not an address at all: `undefined`. */
export function addressIn(value: string | undefined): string | undefined {
  const bare = (value ?? "")
    .replace(/^\s*[\w-]+\s*;\s*/u, "")
    .trim()
    .replace(/^<(.*)>$/u, "$1")
    .trim()
    .toLowerCase();
  return /^[^\s<>]+@[^\s<>]+$/u.test(bare) ? bare : undefined;
}

export function statusIn(value: string | undefined): string | null {
  return /(?<![\d.])([245]\.\d{1,3}\.\d{1,3})(?!\d|\.\d)/u.exec(value ?? "")?.[1] ?? null;
}

const words = (text: string): string => text.replaceAll(/\s+/gu, " ").trim();

/** One report for each recipient block of a delivery status (RFC 3464), written for machines. */
export function fromStatus(text: string, human: string, of: string | null): readonly Report[] {
  return text.split(/\r?\n[ \t]*\r?\n/u).flatMap((block) => {
    const fields = fieldsOf(block);
    const [action, to] = [fields["action"]?.toLowerCase().match(/^\w+/u)?.[0], addressIn(fields["final-recipient"])];
    if (action === undefined || to === undefined) return [];
    const is = action === "failed" ? "failed" : action === "delayed" ? "late" : "delivered";
    const status = statusIn(fields["status"]);
    const diagnostic = (fields["diagnostic-code"] ?? "").replace(/^[\w-]+\s*;\s*/u, "");
    const says = words(diagnostic === "" ? human : diagnostic).slice(0, 400);
    return [{ is, of, to, status, why: is === "delivered" ? null : whyNot(status, diagnostic === "" ? says : diagnostic), says }];
  });
}
