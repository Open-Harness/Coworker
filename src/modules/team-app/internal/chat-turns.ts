import type { ChatLineData } from "../types.ts";

/** What one side said in a row: a person's message, or everything the manager did and wrote before the next one. */
export type Turn =
  | { readonly who: "person"; readonly id: string; readonly line: ChatLineData }
  | { readonly who: "manager"; readonly id: string; readonly parts: readonly TurnPart[] };

/** A stretch of words, or actions taken one after the other. */
export type TurnPart =
  | { readonly kind: "words"; readonly id: string; readonly text: string; readonly streaming?: true }
  | { readonly kind: "actions"; readonly id: string; readonly actions: readonly ActionDone[] };

export interface ActionDone {
  readonly id: string;
  /** `task_create` reads "Task create". */
  readonly name: string;
  /** What it was about, when its result names it. */
  readonly target?: string;
  /** The result as it came. */
  readonly detail: string;
}

const spoken = (tool: string): string => {
  const words = tool.replace(/[_.]/gu, " ").trim();
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
};

function targetOf(detail: string): string | undefined {
  try {
    const result: unknown = JSON.parse(detail);
    if (typeof result !== "object" || result === null) return undefined;
    const named = Object.entries(result).filter(([key, value]) => ["task", "title", "page"].includes(key) && typeof value === "string");
    const title = named.find(([key]) => key === "title");
    const task = named.find(([key]) => key === "task");
    const said = [task, title ?? (task === undefined ? named[0] : undefined)].flatMap((entry) =>
      entry === undefined ? [] : [String(entry[1])],
    );
    return said.length === 0 ? undefined : said.join(" ");
  } catch {
    return undefined;
  }
}

function actionOf({ id, text }: ChatLineData): ActionDone {
  const at = text.indexOf(": ");
  const detail = at === -1 ? "" : text.slice(at + 2);
  const target = targetOf(detail);
  return { id, name: spoken(at === -1 ? text : text.slice(0, at)), detail, ...(target === undefined ? {} : { target }) };
}

function withPart(parts: readonly TurnPart[], line: ChatLineData): readonly TurnPart[] {
  if (line.role !== "action")
    return [...parts, { kind: "words", id: line.id, text: line.text, ...(line.streaming === true ? { streaming: true as const } : {}) }];
  const last = parts.at(-1);
  if (last?.kind !== "actions") return [...parts, { kind: "actions", id: line.id, actions: [actionOf(line)] }];
  return [...parts.slice(0, -1), { ...last, actions: [...last.actions, actionOf(line)] }];
}

export function turnsOf(lines: readonly ChatLineData[]): readonly Turn[] {
  return lines.reduce<readonly Turn[]>((turns, line) => {
    if (line.role === "person") return [...turns, { who: "person", id: line.id, line }];
    const last = turns.at(-1);
    if (last?.who !== "manager") return [...turns, { who: "manager", id: line.id, parts: withPart([], line) }];
    return [...turns.slice(0, -1), { ...last, parts: withPart(last.parts, line) }];
  }, []);
}
