import type { AcceptMode, Admission, Allow, HandleRef, Policy } from "../types.ts";

/** A new manager listens to nobody yet, and only records what it would accept (model.md "Accept mode"). */
export const DEFAULT_POLICY: Policy = { acceptMode: "observe", allowed: [], admission: {}, bots: [] };

type Json = Readonly<Record<string, unknown>>;
const isRecord = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);
const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);
const MODES: readonly AcceptMode[] = ["off", "observe", "auto"];
const ROWS: readonly Admission[] = ["ignore", "inferred", "explicit"];

function handle(value: unknown): HandleRef | undefined {
  if (!isRecord(value) || typeof value["kind"] !== "string" || typeof value["id"] !== "string" || value["id"] === "") return undefined;
  const id = value["kind"] === "email" ? value["id"].trim().toLowerCase() : value["id"];
  return { kind: value["kind"], id, ...(typeof value["space"] === "string" ? { space: value["space"] } : {}) };
}

function allow(value: unknown): Allow[] {
  if (!isRecord(value)) return [];
  if (value["kind"] === "domain" && typeof value["domain"] === "string" && /^[a-z0-9.-]+\.[a-z]{2,}$/iu.test(value["domain"])) {
    return [{ kind: "domain", domain: value["domain"].toLowerCase() }];
  }
  if (value["kind"] === "person" && typeof value["person"] === "string" && value["person"] !== "") {
    return [{ kind: "person", person: value["person"] }];
  }
  const found = value["kind"] === "handle" ? handle(value["handle"]) : undefined;
  return found === undefined ? [] : [{ kind: "handle", handle: found }];
}

export function policyOf(value: unknown): Policy {
  if (!isRecord(value)) return DEFAULT_POLICY;
  const mode = MODES.find((candidate) => candidate === value["acceptMode"]) ?? DEFAULT_POLICY.acceptMode;
  const admission = Object.fromEntries(
    Object.entries(isRecord(value["admission"]) ? value["admission"] : {}).flatMap(([scope, row]) => {
      const known = ROWS.find((candidate) => candidate === row);
      return known === undefined ? [] : [[scope, known] as const];
    }),
  );
  return {
    acceptMode: mode,
    allowed: list(value["allowed"]).flatMap(allow),
    admission,
    bots: list(value["bots"]).flatMap((bot) => handle(bot) ?? []),
  };
}
