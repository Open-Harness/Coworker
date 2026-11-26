import type { Ids } from "~/modules/clock/types.ts";
import type { JoinProof, JoinSettings, SetDomainsResult } from "../types.ts";

interface Row extends Record<string, SqlStorageValue> {
  links_on: number;
  link_secret: string | null;
  domains: string;
}

const DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/u;

export function readJoinSettings(sql: SqlStorage): JoinSettings {
  const row = sql.exec<Row>("SELECT links_on, link_secret, domains FROM join_settings").toArray()[0];
  if (row === undefined) return { linksOn: false, domains: [] };
  const domains = (JSON.parse(row.domains) as readonly string[]).toSorted();
  return row.links_on === 1 && row.link_secret !== null
    ? { linksOn: true, linkSecret: row.link_secret, domains }
    : { linksOn: false, domains };
}

function write(sql: SqlStorage, settings: JoinSettings): void {
  sql.exec(
    `INSERT INTO join_settings (only, links_on, link_secret, domains) VALUES (1, ?, ?, ?)
     ON CONFLICT (only) DO UPDATE SET links_on = excluded.links_on, link_secret = excluded.link_secret, domains = excluded.domains`,
    settings.linksOn ? 1 : 0,
    settings.linkSecret ?? null,
    JSON.stringify(settings.domains),
  );
}

/** 160 bits from the injected ids (two of 80), so a link cannot be guessed. */
const newSecret = (ids: Ids): string => ids.next("link").slice(5) + ids.next("link").slice(5);

export function setInviteLinks(sql: SqlStorage, ids: Ids, on: boolean): JoinSettings {
  const current = readJoinSettings(sql);
  if (on === current.linksOn) return current;
  const next: JoinSettings = on
    ? { linksOn: true, linkSecret: newSecret(ids), domains: current.domains }
    : { linksOn: false, domains: current.domains };
  write(sql, next);
  return next;
}

export function setApprovedDomains(sql: SqlStorage, domains: readonly string[]): SetDomainsResult {
  const cleaned = domains.map((domain) => domain.trim().toLowerCase().replace(/^@/u, ""));
  const invalid = cleaned.find((domain) => !DOMAIN.test(domain));
  if (invalid !== undefined) return { _tag: "InvalidDomain", domain: invalid };
  const settings: JoinSettings = { ...readJoinSettings(sql), domains: [...new Set(cleaned)].toSorted() };
  write(sql, settings);
  return { _tag: "Saved", settings };
}

/** Same time whatever the first differing character, so the secret cannot be found a character at a time. */
function sameText(left: string, right: string): boolean {
  let difference = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    difference |= (left.codePointAt(index) ?? 0) ^ (right.codePointAt(index) ?? 0);
  }
  return difference === 0;
}

export function allowsJoin(sql: SqlStorage, proof: JoinProof): boolean {
  const settings = readJoinSettings(sql);
  if (proof.kind === "domain") return settings.domains.includes(proof.domain.toLowerCase());
  return settings.linksOn && settings.linkSecret !== undefined && sameText(settings.linkSecret, proof.secret);
}
