import type { QuestionDetail, QuestionRef } from "../types.ts";
import { MISSION, type BoardState, type PagesState } from "./state.ts";

type Input = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is Input => typeof value === "object" && value !== null && !Array.isArray(value);
const words = (value: unknown): string | undefined => (typeof value === "string" && value.trim() !== "" ? value.trim() : undefined);
const listOf = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

/** A task id or a page id or title, found on the manager's own board and pages. Unknown refs are undefined. */
export function resolveRef(board: BoardState, pages: PagesState, ref: string): QuestionRef | undefined {
  const number = /^(?:dt-)?(\d+)$/iu.exec(ref.trim())?.[1];
  const task = number === undefined ? undefined : board.tasks[`DT-${number}`];
  if (task !== undefined) {
    return { kind: "task", ref: task.id, title: task.title, sub: board.lanes.find(({ id }) => id === task.lane)?.name ?? task.lane };
  }
  const wanted = ref.trim().toLowerCase();
  const page = pages.pages[ref.trim()] ?? Object.values(pages.pages).find(({ title }) => title.toLowerCase() === wanted) ?? undefined;
  if (page === undefined) return undefined;
  return { kind: "page", ref: page.id, title: page.title, sub: page.id === MISSION ? "Mission" : "Mission sub-page" };
}

function choicesOf(input: Input): QuestionDetail["choices"] {
  const detailed = listOf(input["choices"]).flatMap((choice) => {
    const label = isRecord(choice) ? words(choice["label"]) : undefined;
    if (!isRecord(choice) || label === undefined) return [];
    const risk = words(choice["risk"]);
    const cost = words(choice["cost"]);
    const next = listOf(choice["next"]).flatMap((line) => words(line) ?? []);
    return [{ label, next, ...(risk === undefined ? {} : { risk }), ...(cost === undefined ? {} : { cost }) }];
  });
  if (detailed.length > 0) return detailed;
  return listOf(input["options"])
    .flatMap((option) => words(option) ?? [])
    .map((label) => ({ label, next: [] }));
}

/** What a "Needs you" page shows for one question, or undefined when the manager gave nothing beyond the words. */
export function detailOf(board: BoardState, pages: PagesState, input: Input): QuestionDetail | undefined {
  const context = words(input["context"]);
  const facts = listOf(input["facts"]).flatMap((fact) => {
    const text = isRecord(fact) ? words(fact["text"]) : undefined;
    if (!isRecord(fact) || text === undefined) return [];
    const source = words(fact["source"]);
    const found = source === undefined ? undefined : resolveRef(board, pages, source);
    return [{ text, ...(found === undefined ? {} : { source: found }) }];
  });
  const choices = choicesOf(input);
  const recommended = isRecord(input["recommend"]) ? input["recommend"] : undefined;
  const option = words(recommended?.["option"]);
  const why = words(recommended?.["why"]);
  const links = listOf(input["links"]).flatMap((link) => (typeof link === "string" ? (resolveRef(board, pages, link) ?? []) : []));
  const recommend = option === undefined || why === undefined ? undefined : { option, why };
  if (
    context === undefined &&
    facts.length === 0 &&
    recommend === undefined &&
    links.length === 0 &&
    choices.every(({ next, risk, cost }) => next.length === 0 && risk === undefined && cost === undefined)
  )
    return undefined;
  return { ...(context === undefined ? {} : { context }), facts, choices, ...(recommend === undefined ? {} : { recommend }), links };
}

/** Narrows a detail that came back through a stored outcome. */
export function asDetail(value: unknown): QuestionDetail | undefined {
  return isRecord(value) && Array.isArray(value["facts"]) && Array.isArray(value["choices"]) && Array.isArray(value["links"])
    ? (value as unknown as QuestionDetail)
    : undefined;
}
