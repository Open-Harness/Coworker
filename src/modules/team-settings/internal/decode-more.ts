import { arrayOf, each, isRecord, numberOf, textOf, wordsOf } from "~/modules/team-core/service.ts";
import type { Json } from "~/modules/team-core/types.ts";
import type {
  ActionRow,
  BudgetData,
  CheckData,
  GeneralData,
  MeData,
  ModelChoice,
  NotificationData,
  OwnChange,
  Permission,
  PermissionSet,
  PersonPermissions,
  ProfileData,
  Role,
  RolesData,
  SecretData,
  TestData,
  UsageData,
} from "../types.ts";

/* What the screens that change one thing at a time are sent, narrowed. */

const roleOf = (value: unknown): Role => (value === "owner" || value === "builder" ? value : "member");
const permissionOf = (value: unknown): Permission | undefined => (value === "on" || value === "ask" || value === "off" ? value : undefined);
const strings = (value: unknown): readonly string[] => arrayOf(value).flatMap((entry) => (typeof entry === "string" ? [entry] : []));

function choiceOf(value: unknown): ModelChoice | null {
  return isRecord(value) && typeof value["connectionId"] === "string" && typeof value["model"] === "string"
    ? { connectionId: value["connectionId"], model: value["model"] }
    : null;
}

/** `GET …/general`: `{general, role}`. */
export function decodeGeneral(body: unknown): GeneralData | undefined {
  if (!isRecord(body) || !isRecord(body["general"])) return undefined;
  const { general } = body as { readonly general: Json };
  if (typeof general["name"] !== "string") return undefined;
  return {
    name: general["name"],
    address: textOf(general["address"]),
    mailDomain: textOf(general["mailDomain"]),
    region: general["region"] === "us" ? "us" : "eu",
    createdAt: numberOf(general["createdAt"]),
    timeZone: textOf(general["timeZone"], "UTC"),
    defaultModel: choiceOf(general["defaultModel"]),
    choices: each(general["choices"], (row) =>
      typeof row["connectionId"] === "string"
        ? { connectionId: row["connectionId"], label: textOf(row["label"], row["connectionId"]), models: strings(row["models"]) }
        : undefined,
    ),
    hasLogo: general["hasLogo"] === true,
    role: roleOf(body["role"]),
  };
}

function permissionSet(value: unknown): PermissionSet {
  const pick = (record: unknown): Readonly<Record<string, Permission>> =>
    Object.fromEntries(
      Object.entries(isRecord(record) ? record : {}).flatMap(([key, entry]) => {
        const permission = permissionOf(entry);
        return permission === undefined ? [] : [[key, permission]];
      }),
    );
  const set = isRecord(value) ? value : {};
  return { categories: pick(set["categories"]), actions: pick(set["actions"]) };
}

/** `GET …/roles`. */
export function decodeRoles(body: unknown): RolesData | undefined {
  if (!isRecord(body) || !isRecord(body["presets"]) || !isRecord(body["mine"])) return undefined;
  const { presets, mine } = body as { readonly presets: Json; readonly mine: Json };
  return {
    presets: {
      owner: permissionSet(presets["owner"]),
      builder: permissionSet(presets["builder"]),
      member: permissionSet(presets["member"]),
    },
    categories: strings(body["categories"]),
    actions: each(body["actions"], (row): ActionRow | undefined =>
      typeof row["id"] === "string"
        ? { id: row["id"], category: textOf(row["category"]), label: textOf(row["label"], row["id"]) }
        : undefined,
    ),
    mine: { preset: roleOf(mine["preset"]), own: permissionSet(mine["own"]) },
  };
}

const change = (row: Json): OwnChange | undefined => {
  const value = permissionOf(row["value"]);
  const scope = row["scope"] === "category" || row["scope"] === "action" ? row["scope"] : undefined;
  return value === undefined || scope === undefined || typeof row["key"] !== "string"
    ? undefined
    : { scope, key: row["key"], value, byName: textOf(row["byName"]), at: numberOf(row["at"]) };
};

/** `GET …/permissions`: `{people}`. */
export const decodePermissions = (body: unknown): readonly PersonPermissions[] | undefined =>
  isRecord(body)
    ? each(body["people"], (row) =>
        typeof row["person"] === "string"
          ? {
              person: row["person"],
              name: textOf(row["name"], row["person"]),
              email: textOf(row["email"]),
              preset: roleOf(row["preset"]),
              changes: each(row["changes"], change),
            }
          : undefined,
      )
    : undefined;

const budgetOf = (value: unknown): BudgetData | null =>
  isRecord(value) && typeof value["hours"] === "number"
    ? { hours: value["hours"], whenReached: value["whenReached"] === "tell" ? "tell" : "stop" }
    : null;

/** `GET …/usage`: `{usage}`. */
export function decodeUsage(body: unknown): UsageData | undefined {
  if (!isRecord(body) || !isRecord(body["usage"])) return undefined;
  const { usage } = body as { readonly usage: Json };
  const sandbox = isRecord(usage["sandbox"]) ? usage["sandbox"] : {};
  const used = isRecord(sandbox["hours"]) ? sandbox["hours"] : {};
  const runs = usage["runs"];
  return {
    periodStart: numberOf(usage["periodStart"]),
    renewsAt: numberOf(usage["renewsAt"]),
    hours: { used: numberOf(used["used"]), included: numberOf(used["included"]), over: numberOf(used["over"]) },
    overageCents: numberOf(sandbox["overageCents"]),
    perDay: each(usage["perDay"], (row) =>
      typeof row["day"] === "string" ? { day: row["day"], hours: numberOf(row["hours"]) } : undefined,
    ),
    runs: { thisPeriod: numberOf(isRecord(runs) ? runs["thisPeriod"] : 0), lastPeriod: numberOf(isRecord(runs) ? runs["lastPeriod"] : 0) },
    managers: each(usage["managers"], (row) =>
      typeof row["managerId"] === "string"
        ? {
            managerId: row["managerId"],
            name: textOf(row["name"], row["managerId"]),
            sandboxHours: numberOf(row["sandboxHours"]),
            runs: numberOf(row["runs"]),
            budget: budgetOf(row["budget"]),
          }
        : undefined,
    ),
  };
}

/** What a test call said, from `{connection: {label, check}}`. */
export function decodeCheck(body: unknown): CheckData | undefined {
  if (!isRecord(body) || !isRecord(body["connection"])) return undefined;
  const { connection } = body as { readonly connection: Json };
  const check = isRecord(connection["check"]) ? connection["check"] : {};
  const error = check["_tag"] === "Failed" ? (wordsOf(check["error"]) ?? "The test call failed") : undefined;
  return { label: textOf(connection["label"]), works: check["_tag"] === "Works", ...(error === undefined ? {} : { error }) };
}

export const decodeSecrets = (body: unknown): readonly SecretData[] | undefined =>
  isRecord(body)
    ? each(body["secrets"], (row) =>
        typeof row["name"] === "string" ? { name: row["name"], updatedAt: numberOf(row["updatedAt"]) } : undefined,
      )
    : undefined;

export const decodeNames =
  (field: string) =>
  (body: unknown): readonly string[] | undefined =>
    isRecord(body) ? strings(body[field]) : undefined;

export const decodeTest = (body: unknown): TestData | undefined =>
  isRecord(body) && body["_tag"] === "Tested" ? { ready: body["ready"] === true, output: textOf(body["output"]) } : undefined;

export const decodeAgentNames = (body: unknown): readonly string[] | undefined =>
  isRecord(body) ? each(body["agents"], (row) => (isRecord(row["config"]) ? wordsOf(row["config"]["name"]) : undefined)) : undefined;

function profileOf(value: unknown): ProfileData {
  const row = isRecord(value) ? value : {};
  const hours = isRecord(row["workingHours"]) ? row["workingHours"] : undefined;
  return {
    timeZone: typeof row["timeZone"] === "string" ? row["timeZone"] : null,
    language: textOf(row["language"], "en"),
    workingHours:
      hours === undefined
        ? null
        : {
            days: arrayOf(hours["days"]).filter((day): day is number => typeof day === "number"),
            from: textOf(hours["from"], "09:00"),
            to: textOf(hours["to"], "17:00"),
          },
  };
}

export const notificationsOf = (value: unknown): NotificationData => {
  const row = isRecord(value) ? value : {};
  return {
    events: each(row["events"], (event) =>
      typeof event["event"] === "string"
        ? { event: event["event"], label: textOf(event["label"], event["event"]), email: event["email"] === true }
        : undefined,
    ),
    quietHours: row["quietHours"] === true,
  };
};

/** `GET …/me`. */
export function decodeMe(body: unknown): MeData | undefined {
  if (!isRecord(body) || !isRecord(body["person"])) return undefined;
  return {
    name: textOf(body["person"]["name"]),
    email: textOf(body["person"]["email"]),
    role: roleOf(body["role"]),
    profile: profileOf(body["profile"]),
    notifications: notificationsOf(body["notifications"]),
  };
}
