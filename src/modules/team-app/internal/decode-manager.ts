import { each, isRecord, numberOf, textOf, wordsOf } from "~/modules/team-core/service.ts";
import type { Json } from "~/modules/team-core/types.ts";
import type { Allowed, ChatLineData, MissionData, PageData, SaveResult } from "../types.ts";

/* A manager's chat and mission, narrowed. */

function line(row: Json): ChatLineData | undefined {
  const { id, role, author } = row;
  if (typeof id !== "string" || (role !== "person" && role !== "manager" && role !== "action")) return undefined;
  const by = isRecord(author) ? { authorId: textOf(author["id"]), authorName: textOf(author["name"]) } : {};
  return { id, role, text: textOf(row["text"]), ...(row["streaming"] === true ? { streaming: true as const } : {}), ...by };
}

/** `GET …/managers/<id>/chat` is the lines themselves. */
export const decodeChat = (body: unknown): readonly ChatLineData[] | undefined => (Array.isArray(body) ? each(body, line) : undefined);

function page(row: Json): PageData | undefined {
  if (typeof row["id"] !== "string") return undefined;
  const parent = wordsOf(row["parent"]);
  const by = row["updatedBy"];
  return {
    id: row["id"],
    ...(parent === undefined ? {} : { parent }),
    title: textOf(row["title"], row["id"]),
    body: textOf(row["body"]),
    updatedAt: numberOf(row["updatedAt"]),
    updatedBy: isRecord(by) ? textOf(by["name"]) : "",
  };
}

const allowed = (value: unknown): Allowed => (value === "on" || value === "ask" ? value : "off");

/** `GET …/managers/<id>/pages`: `{pages, can}`. Whoever is not told what they may do, may read. */
export function decodePages(body: unknown): MissionData | undefined {
  if (!isRecord(body)) return undefined;
  const can = isRecord(body["can"]) ? body["can"] : {};
  return { pages: each(body["pages"], page), can: { mission: allowed(can["mission"]), page: allowed(can["page"]) } };
}

/**
 * An action's answer: `Done`, or `Ask` when an Owner has to approve it first. A handler that could not do it (a page that
 * changed meanwhile) is also `Done`, with `{ok: false, message}` as its value: that is a refusal, not a save.
 */
export function decodeSave(body: unknown): SaveResult | undefined {
  if (!isRecord(body)) return undefined;
  if (body["_tag"] === "Ask") return { _tag: "Waiting" };
  if (body["_tag"] !== "Done") return undefined;
  const value = body["value"];
  if (isRecord(value) && value["ok"] === false) return { _tag: "Refused", message: textOf(value["message"], "It was not saved") };
  return { _tag: "Saved" };
}
