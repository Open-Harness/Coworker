import { each, isRecord, numberOf, textOf, wordsOf } from "~/modules/team-core/service.ts";
import type { Json } from "~/modules/team-core/types.ts";
import type { HandleData, InviteData, JoiningData, MemberData, PersonData, Role, WorkspaceData } from "../types.ts";

/* The workspace and who is in it, narrowed. */

const roleOf = (value: unknown): Role => (value === "owner" || value === "builder" ? value : "member");
/** Better Auth sends dates as ISO text. */
const timeOf = (value: unknown): number => (typeof value === "string" ? Date.parse(value) || 0 : numberOf(value));

/** `GET /api/workspaces/<id>`: `{_tag: "Opened", profile, role}`. */
export function decodeWorkspace(body: unknown): WorkspaceData | undefined {
  if (!isRecord(body) || !isRecord(body["profile"])) return undefined;
  const { profile } = body as { readonly profile: Json };
  if (typeof profile["workspaceId"] !== "string") return undefined;
  return {
    workspaceId: profile["workspaceId"],
    name: textOf(profile["name"]),
    address: textOf(profile["address"]),
    region: profile["region"] === "us" ? "us" : "eu",
    createdAt: numberOf(profile["createdAt"]),
    role: roleOf(body["role"]),
  };
}

function member(row: Json): MemberData | undefined {
  const user = isRecord(row["user"]) ? row["user"] : {};
  if (typeof row["id"] !== "string") return undefined;
  const email = textOf(user["email"]);
  return {
    id: row["id"],
    name: wordsOf(user["name"]) ?? email.split("@")[0] ?? "",
    email,
    role: roleOf(row["role"]),
    joinedAt: timeOf(row["createdAt"]),
  };
}

/** Better Auth's `list-members`: `{members}`. */
export const decodeMembers = (body: unknown): readonly MemberData[] | undefined =>
  isRecord(body) ? each(body["members"], member) : undefined;

/** Better Auth's `list-invitations` is the list itself, answered ones included. */
export const decodeInvites = (body: unknown): readonly InviteData[] | undefined =>
  Array.isArray(body)
    ? each(body, (row) =>
        typeof row["id"] === "string" && row["status"] === "pending"
          ? { id: row["id"], email: textOf(row["email"]), role: roleOf(row["role"]), expiresAt: timeOf(row["expiresAt"]) }
          : undefined,
      )
    : undefined;

/** `GET …/join`: `{_tag: "Settings", linksOn, linkPath?, domains}`. */
export function decodeJoining(body: unknown): JoiningData | undefined {
  if (!isRecord(body) || body["_tag"] !== "Settings") return undefined;
  const linkPath = wordsOf(body["linkPath"]);
  const domains = Array.isArray(body["domains"]) ? body["domains"].filter((domain) => typeof domain === "string") : [];
  return { linksOn: body["linksOn"] === true, ...(linkPath === undefined ? {} : { linkPath }), domains };
}

function handle(row: Json): HandleData | undefined {
  const display = wordsOf(row["display"]);
  return typeof row["kind"] === "string" && typeof row["id"] === "string"
    ? { kind: row["kind"], id: row["id"], ...(display === undefined ? {} : { display }), proof: textOf(row["proof"]) }
    : undefined;
}

/** `GET …/people`: `{people: [{person, handles}]}`. A person id is `email:<their address>`. */
export const decodePeople = (body: unknown): readonly PersonData[] | undefined =>
  isRecord(body)
    ? each(body["people"], (row) =>
        typeof row["person"] === "string"
          ? { person: row["person"], name: row["person"].replace(/^email:/u, ""), handles: each(row["handles"], handle) }
          : undefined,
      )
    : undefined;

/** Members first, with the address they sign in with; then people only known by a Handle. */
export function withMembers(people: readonly PersonData[], members: readonly MemberData[]): readonly PersonData[] {
  const known = members.map(({ name, email, role }): PersonData => {
    const person = `email:${email.toLowerCase()}`;
    const others = people.find((entry) => entry.person === person)?.handles ?? [];
    const signIn: HandleData = { kind: "email", id: email.toLowerCase(), proof: "signed_in" };
    return { person, name, role, handles: [signIn, ...others.filter(({ kind, id }) => kind !== "email" || id !== signIn.id)] };
  });
  return [...known, ...people.filter(({ person }) => !known.some((entry) => entry.person === person))];
}
