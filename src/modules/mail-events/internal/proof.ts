import type { From, Us } from "../types.ts";
import { domainOf } from "./address.ts";
import { belongTogether } from "./suffix.ts";

interface Result {
  readonly method: string;
  readonly value: string;
  readonly props: Readonly<Record<string, string>>;
}

/** `dkim=pass (a comment) header.d=x.example header.s=k1`, as results. Comments are what a sender can say, so they are not read. */
function results(header: string): { readonly server: string; readonly all: readonly Result[] } {
  const [first = "", ...rest] = header.replaceAll(/\([^)]*\)/gu, " ").split(";");
  const all = rest.flatMap((part) => {
    const head = /^\s*([a-z0-9_-]+)\s*=\s*([a-z0-9_-]+)/iu.exec(part);
    if (head === null) return [];
    const props: Record<string, string> = {};
    for (const [, key = "", value = ""] of part.matchAll(/([a-z0-9_.-]+)\s*=\s*"?([^\s;"]+)/giu))
      props[key.toLowerCase()] ??= value.toLowerCase();
    return [{ method: (head[1] ?? "").toLowerCase(), value: (head[2] ?? "").toLowerCase(), props }];
  });
  return { server: (first.trim().split(/\s+/u)[0] ?? "").toLowerCase(), all };
}

const NOT_PROVEN: From = { proven: false, by: null, refused: false };

/**
 * Only our own server's word counts, and only the first of its `Authentication-Results`: it puts its own on top, and what is
 * under it came with the mail.
 */
export function proofOf(headers: readonly { readonly key: string; readonly value: string }[], from: string, us: Us): From {
  const ours = headers
    .filter(({ key }) => key === "authentication-results")
    .map(({ value }) => results(value))
    .find(({ server }) => server === us.server.toLowerCase());
  const domain = domainOf(from);
  if (ours === undefined || domain === "" || !from.includes("@")) return NOT_PROVEN;
  const signed = ours.all.some(
    ({ method, value, props }) => method === "dkim" && value === "pass" && belongTogether(props["header.d"] ?? "", domain),
  );
  if (signed) return { proven: true, by: "dkim", refused: false };
  const aligned = ours.all.some(
    ({ method, value, props }) =>
      method === "dmarc" && value === "pass" && (props["header.from"] === undefined || belongTogether(props["header.from"], domain)),
  );
  if (aligned) return { proven: true, by: "dmarc", refused: false };
  const refused = ours.all.some(
    ({ method, value, props }) =>
      method === "dmarc" && value === "fail" && (props["header.from"] === undefined || belongTogether(props["header.from"], domain)),
  );
  return { ...NOT_PROVEN, refused };
}
