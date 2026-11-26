import type { ThreadPage } from "~/modules/views-manager/types.ts";
import type { Clock } from "~/modules/page/types.ts";
import { dayMonth } from "../manager-frame/words.ts";

/* What the thread page shows, made of what the view holds: its lines cut into the messages it said, and the views of the side panel. */

type Line = ThreadPage["thread"]["lines"][number];
export type Call = Extract<Line, { is: "called" }>;
export type Part =
  | { readonly kind: "say"; readonly text: string }
  | { readonly kind: "think"; readonly text: string }
  | { readonly kind: "told"; readonly by: string; readonly text: string }
  | { readonly kind: "calls"; readonly calls: Call[] };
export interface Message {
  readonly at: number;
  readonly parts: Part[];
}

/** Each message begins at something the thread said; the calls that follow stay together. Thinking opens the message it led to. */
export function messages(lines: readonly Line[]): Message[] {
  const out: Message[] = [];
  for (const line of lines) {
    if (line.is === "ended" || line.is === "asked") continue;
    const open = out.at(-1);
    const isOnlyThinking = open !== undefined && open.parts.every((one) => one.kind === "think");
    if (line.is === "thought" || (line.is === "said" && !isOnlyThinking) || open === undefined) out.push({ at: line.at, parts: [] });
    const message = out.at(-1);
    if (message === undefined) continue;
    const last = message.parts.at(-1);
    if (line.is === "called") {
      if (last?.kind === "calls") last.calls.push(line);
      else message.parts.push({ kind: "calls", calls: [line] });
    } else if (line.is === "told") message.parts.push({ kind: "told", by: line.by, text: line.text });
    else message.parts.push({ kind: line.is === "said" ? "say" : "think", text: line.text });
  }
  return out;
}

/** `0.8 s`, `21 s`. */
export const seconds = (ms: number): string => `${Number((ms / 1000).toFixed(ms < 10_000 ? 1 : 0))} s`;

/** An instant as `2026-11-25T09:48:00`, in the zone: what a Timestamp is given. */
export function iso(at: number, zone: string): string {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at);
  return `${day}T${time}:00`;
}

export type View = "changes" | "files" | "terminal" | "may-use";
export interface Shown {
  readonly id: View;
  readonly label: string;
  readonly title: string;
  readonly sub: string;
}

export interface Facts {
  readonly page: ThreadPage;
  readonly manager: string;
  readonly clock: Clock;
  readonly zone: string;
}

/** The file it changed, and when it did. The first edit it made. */
const editOf = (page: ThreadPage): Call | undefined =>
  page.thread.lines.find((one): one is Call => one.is === "called" && one.tool === "edit");

export function viewsOf({ page, manager, clock, zone }: Facts): readonly Shown[] {
  const edit = editOf(page);
  const live = page.thread.state === "working" ? "Live · " : "";
  return [
    {
      id: "changes",
      label: "Changes",
      title: `Changes to ${edit?.target ?? page.thread.files[0]?.path ?? "the repo"}`,
      sub: edit === undefined ? "Nothing changed yet" : `${live}${dayMonth(edit.at, zone)}, ${clock.time(edit.at)}`,
    },
    { id: "files", label: "Files touched", title: "Files touched", sub: "By this thread, so far" },
    { id: "terminal", label: "Terminal output", title: "Terminal output", sub: "Each command it ran" },
    { id: "may-use", label: "What it may use", title: "What it may use", sub: `Set by ${manager}, version ${page.thread.version}` },
  ];
}

/** Each command it ran, and what it printed. */
export const terminalOf = (page: ThreadPage): string =>
  page.thread.lines
    .flatMap((one) =>
      one.is === "called" && one.tool === "run" ? [`$ ${one.target}   (${seconds(one.took)}${one.ok ? "" : ", failed"})\n${one.out}`] : [],
    )
    .join("\n\n");

export const textOf = (view: View, page: ThreadPage): string =>
  view === "changes"
    ? (page.thread.diff ?? "")
    : view === "terminal"
      ? terminalOf(page)
      : view === "files"
        ? page.touched.map((one) => `${one.path}  ${one.says}`).join("\n")
        : page.thread.mayUse.join("\n");

export const fileOf = (page: ThreadPage): string => editOf(page)?.target ?? page.thread.files[0]?.path ?? "";
