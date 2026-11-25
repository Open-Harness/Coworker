import { arrayOf, each, isRecord, numberOf, textOf, wordsOf } from "~/modules/team-core/service.ts";
import type { Json } from "~/modules/team-core/types.ts";
import type { AuditData, AuditPage, BillingData, EnvironmentData, GitHubData, KeysData, ModelData, ModelSource } from "../types.ts";

/* What the workspace runs on, narrowed. */

const SOURCES: readonly ModelSource[] = ["anthropic", "openai", "google", "opencode", "endpoint", "chatgpt"];
const words = (value: unknown): readonly string[] => arrayOf(value).flatMap((entry) => wordsOf(entry) ?? []);

function model(row: Json): ModelData | undefined {
  const source = SOURCES.find((name) => name === row["source"]);
  if (typeof row["id"] !== "string" || source === undefined) return undefined;
  const check = isRecord(row["check"]) ? row["check"] : {};
  const error = check["_tag"] === "Failed" ? (wordsOf(check["error"]) ?? "The test call failed") : undefined;
  return {
    id: row["id"],
    source,
    label: textOf(row["label"]),
    baseUrl: textOf(row["baseUrl"]),
    models: words(row["models"]),
    checkedAt: numberOf(check["checkedAt"]),
    ...(error === undefined ? {} : { error }),
  };
}

/** `GET …/models`: `{connections, readiness}`. */
export function decodeKeys(body: unknown): KeysData | undefined {
  if (!isRecord(body)) return undefined;
  const readiness = isRecord(body["readiness"]) ? body["readiness"] : {};
  const notReady = readiness["_tag"] === "NoModel" ? wordsOf(readiness["reason"]) : undefined;
  return { connections: each(body["connections"], model), ...(notReady === undefined ? {} : { notReady }) };
}

/** `GET …/github`: `{github: {installation?, sources}, installUrl?}`. */
export function decodeGitHub(body: unknown): GitHubData | undefined {
  if (!isRecord(body) || !isRecord(body["github"])) return undefined;
  const { installation } = body["github"];
  const installUrl = wordsOf(body["installUrl"]);
  const install = installUrl === undefined ? {} : { installUrl };
  if (!isRecord(installation)) return { repos: [], ...install };
  const repos = arrayOf(installation["repos"]).flatMap((repo) => wordsOf(isRecord(repo) ? repo["name"] : repo) ?? []);
  return { account: textOf(installation["account"], "GitHub"), repos, ...install };
}

const billing = (view: Json): BillingData | undefined => {
  const { plan, hours, limit } = view;
  if (!isRecord(plan) || !isRecord(hours) || !isRecord(limit)) return undefined;
  return {
    plan: textOf(plan["name"]),
    seatCents: numberOf(plan["seatCents"]),
    includedHoursPerSeat: numberOf(plan["includedHoursPerSeat"]),
    overageCentsPerHour: numberOf(plan["overageCentsPerHour"]),
    seats: numberOf(view["seats"]),
    nextSeats: numberOf(view["nextSeats"]),
    periodStart: numberOf(view["periodStart"]),
    renewsAt: numberOf(view["renewsAt"]),
    hoursUsed: numberOf(hours["used"]),
    hoursIncluded: numberOf(hours["included"]),
    hoursOver: numberOf(hours["over"]),
    overageCents: numberOf(view["overageCents"]),
    limitOn: limit["on"] === true,
    limitCents: numberOf(limit["overCents"]),
    stopped: view["stopped"] === true,
  };
};

/** `GET …/billing` and the answer to a new limit both carry `{billing}`. */
export const decodeBilling = (body: unknown): BillingData | undefined =>
  isRecord(body) && isRecord(body["billing"]) ? billing(body["billing"]) : undefined;

function auditLine(row: Json): AuditData | undefined {
  const by = isRecord(row["by"]) ? row["by"] : {};
  const outcome = (["done", "refused", "asked", "failed"] as const).find((name) => name === row["outcome"]);
  if (outcome === undefined) return undefined;
  const approvedBy = wordsOf(row["approvedBy"]);
  return {
    at: numberOf(row["at"]),
    by: textOf(by["name"]),
    isManager: by["kind"] === "manager",
    sentence: textOf(row["sentence"]),
    permission: textOf(row["permission"]),
    ...(approvedBy === undefined ? {} : { approvedBy }),
    outcome,
    managerId: textOf(row["managerId"]),
  };
}

/** `GET …/audit`: `{entries, next?}`. */
export function decodeAudit(body: unknown): AuditPage | undefined {
  if (!isRecord(body)) return undefined;
  const next = wordsOf(body["next"]);
  return { entries: each(body["entries"], auditLine), ...(next === undefined ? {} : { next }) };
}

/** `GET …/environments`: `{environments}`. */
export const decodeEnvironments = (body: unknown): readonly EnvironmentData[] | undefined =>
  isRecord(body)
    ? each(body["environments"], (row) => {
        if (typeof row["id"] !== "string") return undefined;
        const output = wordsOf(row["output"]);
        return {
          id: row["id"],
          name: textOf(row["name"]),
          setup: textOf(row["setup"]),
          size: textOf(row["size"]),
          version: numberOf(row["version"], 1),
          updatedAt: numberOf(row["updatedAt"]),
          status: row["status"] === "Ready" || row["status"] === "Failed" ? row["status"] : "Not started",
          usedBy: words(row["usedBy"]),
          ...(output === undefined ? {} : { output }),
        };
      })
    : undefined;
