import { arrayOf as list, isRecord, wordsOf as words } from "~/modules/team-core/service.ts";
import type { ChoiceData, ItemData, RefData } from "../types.ts";

/* Narrows an Inbox item from the server. A malformed fact, choice or link is left out. */

const optional = <K extends string>(key: K, value: string | undefined): { [P in K]?: string } =>
  (value === undefined ? {} : { [key]: value }) as { [P in K]?: string };

function ref(value: unknown): RefData | undefined {
  if (!isRecord(value) || (value["kind"] !== "task" && value["kind"] !== "page")) return undefined;
  const id = words(value["ref"]);
  return id === undefined
    ? undefined
    : { kind: value["kind"], ref: id, title: words(value["title"]) ?? id, sub: words(value["sub"]) ?? "" };
}

function choice(value: unknown): ChoiceData[] {
  const label = isRecord(value) ? words(value["label"]) : undefined;
  if (!isRecord(value) || label === undefined) return [];
  const next = list(value["next"]).flatMap((line) => words(line) ?? []);
  return [{ label, next, ...optional("risk", words(value["risk"])), ...optional("cost", words(value["cost"])) }];
}

function fact(value: unknown): { text: string; source?: RefData }[] {
  const text = isRecord(value) ? words(value["text"]) : undefined;
  if (!isRecord(value) || text === undefined) return [];
  const source = ref(value["source"]);
  return [{ text, ...(source === undefined ? {} : { source }) }];
}

/** An `InboxItem` (src/modules/workspace/types.ts), its `detail` flattened in. */
export function decodeItem(value: unknown): ItemData | undefined {
  if (!isRecord(value) || typeof value["id"] !== "string") return undefined;
  const kind = value["kind"];
  if (kind !== "approval" && kind !== "question" && kind !== "notice") return undefined;
  const detail = isRecord(value["detail"]) ? value["detail"] : {};
  const options = list(value["options"]).flatMap((option) => words(option) ?? []);
  const detailed = list(detail["choices"]).flatMap(choice);
  const recommend = isRecord(detail["recommend"]) ? detail["recommend"] : undefined;
  const option = words(recommend?.["option"]);
  const why = words(recommend?.["why"]);
  const answer = isRecord(value["answer"]) ? value["answer"] : undefined;
  const answered = words(answer?.["text"]) ?? words(answer?.["decision"]);
  return {
    id: value["id"],
    kind,
    managerId: words(value["managerId"]) ?? "",
    managerName: words(value["managerName"]) ?? "",
    title: words(value["title"]) ?? "",
    ...optional("task", words(value["task"])),
    createdAt: typeof value["createdAt"] === "number" ? value["createdAt"] : 0,
    ...optional("context", words(detail["context"])),
    facts: list(detail["facts"]).flatMap(fact),
    choices: detailed.length > 0 ? detailed : options.map((label) => ({ label, next: [] })),
    ...(option === undefined || why === undefined ? {} : { recommend: { option, why } }),
    links: list(detail["links"]).flatMap((link) => ref(link) ?? []),
    ...(answered === undefined ? {} : { answer: { text: answered, byName: words(answer?.["byName"]) ?? "" } }),
  };
}

/** `GET …/inbox/<id>` gives `{item}`; answering gives `{_tag: "Answered", item}`. */
export const decodeItemBody = (body: unknown): ItemData | undefined => (isRecord(body) ? decodeItem(body["item"]) : undefined);
