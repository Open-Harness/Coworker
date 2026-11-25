import { arrayOf, each, isRecord, textOf, wordsOf } from "~/modules/team-core/service.ts";
import type { Json } from "~/modules/team-core/types.ts";
import type {
  AcceptMode,
  ActionRow,
  Admission,
  Allow,
  FieldInfo,
  FieldType,
  HandleRef,
  LaneInfo,
  ManagerInfo,
  Permission,
  PermissionsData,
  PersonName,
  PolicyData,
  Settings,
  TemplateData,
  ViewName,
} from "../types.ts";

/* A manager's settings, as the server sends them. Anything malformed is left out rather than shown wrong. */

export const VIEWS: readonly ViewName[] = ["kanban", "list", "console", "inbox"];
const FIELD_TYPES: readonly FieldType[] = ["select", "text", "number", "date", "person"];
const MODES: readonly AcceptMode[] = ["off", "observe", "auto"];
const ADMISSIONS: readonly Admission[] = ["ignore", "inferred", "explicit"];
const PERMISSIONS: readonly Permission[] = ["on", "ask", "off"];

const oneOf = <T extends string>(all: readonly T[], value: unknown): T | undefined => all.find((one) => one === value);

function lane(row: Json): LaneInfo | undefined {
  if (typeof row["id"] !== "string") return undefined;
  const limit = row["limit"];
  return {
    id: row["id"],
    name: textOf(row["name"], row["id"]),
    meaning: textOf(row["meaning"]),
    needsApproval: row["needsApproval"] === true,
    ...(typeof limit === "number" ? { limit } : {}),
  };
}

function field(row: Json): FieldInfo | undefined {
  const type = oneOf(FIELD_TYPES, row["type"]);
  if (typeof row["key"] !== "string" || type === undefined) return undefined;
  const options = each(row["options"], (option) => {
    if (typeof option["value"] !== "string") return undefined;
    const tone = oneOf(["red", "amber", "green"] as const, option["tone"]);
    return { value: option["value"], ...(tone === undefined ? {} : { tone }) };
  });
  return { key: row["key"], label: textOf(row["label"], row["key"]), type, options };
}

/** `GET …/managers/<id>`: `{manager, board}`. */
export function decodeManager(body: unknown): ManagerInfo | undefined {
  if (!isRecord(body) || !isRecord(body["manager"]) || !isRecord(body["board"])) return undefined;
  const { manager, board } = { manager: body["manager"], board: body["board"] };
  if (typeof manager["managerId"] !== "string") return undefined;
  return {
    managerId: manager["managerId"],
    name: textOf(manager["name"], manager["managerId"]),
    address: textOf(manager["address"]),
    template: textOf(manager["template"]),
    lanes: each(board["lanes"], lane),
    fields: each(board["fields"], field),
    defaultView: oneOf(VIEWS, board["defaultView"]) ?? "kanban",
    tasks: each(board["tasks"], (task) => (typeof task["id"] === "string" ? { id: task["id"], lane: textOf(task["lane"]) } : undefined)),
  };
}

function handle(value: unknown): HandleRef | undefined {
  if (!isRecord(value) || typeof value["kind"] !== "string" || typeof value["id"] !== "string") return undefined;
  const space = wordsOf(value["space"]);
  return { kind: value["kind"], id: value["id"], ...(space === undefined ? {} : { space }) };
}

function allowed(row: Json): Allow | undefined {
  if (row["kind"] === "person" && typeof row["person"] === "string") return { kind: "person", person: row["person"] };
  if (row["kind"] === "domain" && typeof row["domain"] === "string") return { kind: "domain", domain: row["domain"] };
  const ref = handle(row["handle"]);
  return row["kind"] === "handle" && ref !== undefined ? { kind: "handle", handle: ref } : undefined;
}

/** `GET` and `PUT …/managers/<id>/policy`: `{policy}`. */
export function decodePolicy(body: unknown): PolicyData | undefined {
  const policy = isRecord(body) ? body["policy"] : undefined;
  if (!isRecord(policy)) return undefined;
  const admission = isRecord(policy["admission"]) ? policy["admission"] : {};
  return {
    acceptMode: oneOf(MODES, policy["acceptMode"]) ?? "off",
    allowed: each(policy["allowed"], allowed),
    admission: Object.fromEntries(
      Object.entries(admission).flatMap(([scope, how]) => {
        const known = oneOf(ADMISSIONS, how);
        return known === undefined ? [] : [[scope, known] as const];
      }),
    ),
    bots: arrayOf(policy["bots"]).flatMap((bot) => handle(bot) ?? []),
  };
}

/** `GET …/people`: `{people: [{person}]}`, named by the address in their id. */
export const decodePeople = (body: unknown): readonly PersonName[] | undefined =>
  isRecord(body)
    ? each(body["people"], (row) =>
        typeof row["person"] === "string" ? { person: row["person"], name: row["person"].replace(/^email:/u, "") } : undefined,
      )
    : undefined;

const settings = (value: unknown): Settings =>
  Object.fromEntries(
    Object.entries(isRecord(value) ? value : {}).flatMap(([name, one]) => {
      const known = oneOf(PERMISSIONS, one);
      return known === undefined ? [] : [[name, known] as const];
    }),
  );

function actionRow(row: Json): ActionRow | undefined {
  const fallback = oneOf(PERMISSIONS, row["default"]);
  return typeof row["id"] === "string" && fallback !== undefined
    ? {
        id: row["id"],
        category: textOf(row["category"]),
        label: textOf(row["label"], row["id"]),
        screen: textOf(row["screen"]),
        default: fallback,
      }
    : undefined;
}

/** `GET …/managers/<id>/permissions`. */
export function decodePermissions(body: unknown): PermissionsData | undefined {
  const own = isRecord(body) ? body["permissions"] : undefined;
  if (!isRecord(body) || !isRecord(own)) return undefined;
  const defaults = isRecord(own["templateDefaults"]) ? own["templateDefaults"] : {};
  return {
    categories: settings(own["categories"]),
    actions: settings(own["actions"]),
    template: textOf(own["template"]),
    templateDefaults: { categories: settings(defaults["categories"]), actions: settings(defaults["actions"]) },
    catalogue: each(body["actions"], actionRow),
    categoryDefaults: settings(body["categoryDefaults"]),
  };
}

/** `GET …/templates`: `{templates}`. */
export const decodeTemplates = (body: unknown): readonly TemplateData[] | undefined =>
  isRecord(body)
    ? each(body["templates"], (row) =>
        typeof row["id"] === "string"
          ? {
              id: row["id"],
              name: textOf(row["name"], row["id"]),
              about: textOf(row["about"]),
              opensOn: oneOf(VIEWS, row["opensOn"]) ?? "kanban",
              lanes: each(row["lanes"], (one) => wordsOf(one["name"])),
              fields: each(row["fields"], (one) => wordsOf(one["label"])),
            }
          : undefined,
      )
    : undefined;

/** `POST …/managers` answers `{manager: {managerId}}`. */
export const decodeMade = (body: unknown): string | undefined =>
  isRecord(body) && isRecord(body["manager"]) ? wordsOf(body["manager"]["managerId"]) : undefined;

/** `GET …/list-members` (Better Auth): `{members: [{user: {email, name}}]}`, by the address they sign in with. */
export const decodeMembers = (body: unknown): readonly PersonName[] | undefined =>
  isRecord(body)
    ? each(body["members"], (row) => {
        const user = isRecord(row["user"]) ? row["user"] : {};
        const email = wordsOf(user["email"]);
        return email === undefined ? undefined : { person: `email:${email.toLowerCase()}`, name: wordsOf(user["name"]) ?? email };
      })
    : undefined;

/** Members first, by their names; then people only known by a handle. */
export const withMembers = (known: readonly PersonName[], members: readonly PersonName[]): readonly PersonName[] => [
  ...members,
  ...known.filter(({ person }) => !members.some((member) => member.person === person)),
];
