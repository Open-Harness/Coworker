import { readAgentConfig } from "~/modules/agents/service.ts";
import { arrayOf, each, isRecord, numberOf, textOf } from "~/modules/team-core/service.ts";
import type { Json } from "~/modules/team-core/types.ts";
import type { AgentData, AgentOptions, ModelOption, Role, SkillData, VersionData } from "../types.ts";

/* Agents, skills and the workspace's models, as the server sends them. */

const strings = (value: unknown): readonly string[] => arrayOf(value).flatMap((one) => (typeof one === "string" ? one : []));

const versions = (value: unknown): readonly VersionData[] =>
  each(value, (row) =>
    typeof row["version"] === "number"
      ? { version: row["version"], savedAt: numberOf(row["savedAt"]), savedBy: textOf(row["savedBy"]), note: textOf(row["note"]) }
      : undefined,
  );

export function decodeAgent(row: Json): AgentData | undefined {
  if (typeof row["id"] !== "string" || !isRecord(row["config"])) return undefined;
  return {
    id: row["id"],
    config: readAgentConfig(row["config"]),
    version: numberOf(row["version"], 1),
    versions: versions(row["versions"]),
  };
}

/** `GET …/agents`: `{agents, environments}`. */
export const decodeAgents = (body: unknown): { readonly agents: readonly AgentData[]; readonly options: AgentOptions } | undefined =>
  isRecord(body)
    ? {
        agents: each(body["agents"], decodeAgent),
        options: {
          environments: each(body["environments"], (row) =>
            typeof row["id"] === "string" ? { id: row["id"], name: textOf(row["name"], row["id"]) } : undefined,
          ),
        },
      }
    : undefined;

/** A save answers `{_tag: "Saved", value}`. */
export const decodeSavedAgent = (body: unknown): AgentData | undefined =>
  isRecord(body) && body["_tag"] === "Saved" && isRecord(body["value"]) ? decodeAgent(body["value"]) : undefined;

export function decodeSkill(row: Json): SkillData | undefined {
  if (typeof row["id"] !== "string") return undefined;
  const files = isRecord(row["files"]) ? row["files"] : {};
  return {
    id: row["id"],
    name: textOf(row["name"], row["id"]),
    files: Object.fromEntries(Object.entries(files).flatMap(([path, text]) => (typeof text === "string" ? [[path, text] as const] : []))),
    version: numberOf(row["version"], 1),
    checks: each(row["checks"], (check) =>
      check["level"] === "ok" || check["level"] === "warn" || check["level"] === "error"
        ? { level: check["level"], text: textOf(check["text"]) }
        : undefined,
    ),
    versions: versions(row["versions"]),
  };
}

/** `GET …/skills`: `{skills}`. */
export const decodeSkills = (body: unknown): readonly SkillData[] | undefined =>
  isRecord(body) ? each(body["skills"], decodeSkill) : undefined;

export const decodeSavedSkill = (body: unknown): SkillData | undefined =>
  isRecord(body) && body["_tag"] === "Saved" && isRecord(body["value"]) ? decodeSkill(body["value"]) : undefined;

/** A deletion answers `{_tag: "Deleted"}`. */
export const decodeDeleted = (body: unknown): true | undefined => (isRecord(body) && body["_tag"] === "Deleted" ? true : undefined);

/** `GET …/general`: `{general: {choices}, role}`. */
export function decodeGeneral(body: unknown): { readonly role: Role; readonly models: readonly ModelOption[] } | undefined {
  if (!isRecord(body) || !isRecord(body["general"])) return undefined;
  const role = body["role"] === "owner" || body["role"] === "builder" ? body["role"] : "member";
  const models = each(body["general"]["choices"], (row): ModelOption | undefined =>
    typeof row["connectionId"] === "string"
      ? { connectionId: row["connectionId"], label: textOf(row["label"], row["connectionId"]), models: strings(row["models"]) }
      : undefined,
  );
  return { role, models };
}
