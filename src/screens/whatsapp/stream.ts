import type { Clock } from "~/modules/page/types.ts";
import type { Entry } from "~/modules/views-connector/types.ts";
import type { Line } from "./types.ts";

/** What the stream is drawn as: the manager's lines on the right, theirs on the left, quiet notes between. */
export interface Say {
  readonly clock: Clock;
  /** The co-worker's name, for a line a person wrote as it. */
  readonly who: string;
}

const lastWord = (text: string): string => text.split(" ").at(-1) ?? text;

/** One entry of a stream as a line, or none for the kinds a messaging view does not draw. */
export function lineOf(entry: Entry, { clock, who }: Say): Line | undefined {
  const time = clock.time(entry.at);
  if (entry.is === "in") {
    const photo = entry.files[0]?.name;
    return { kind: "msg", id: entry.id, side: "them", name: entry.by, time, text: entry.text, ...(photo === undefined ? {} : { photo }) };
  }
  if (entry.is === "out")
    return {
      kind: "msg",
      id: entry.id,
      side: "me",
      time,
      text: entry.text,
      by: entry.person ? `${entry.by}, as ${who}` : entry.by,
      ...(entry.sent ? {} : { unsent: true }),
    };
  if (entry.is === "draft") return { kind: "msg", id: entry.id, side: "me", time, text: entry.text, by: entry.by, unsent: true };
  if (entry.is === "note")
    return {
      kind: "note",
      id: entry.id,
      text: entry.text,
      ...(entry.link === null ? {} : { link: { label: lastWord(entry.text), to: entry.link } }),
    };
  return undefined;
}

const dayOf = (at: number, zone: string): string =>
  new Intl.DateTimeFormat("en-GB", { timeZone: zone, day: "numeric", month: "short" }).format(at);

/** A stream, oldest first, with a quiet line wherever the day changes, and at the start when it began before today. */
export function linesOf(stream: readonly Entry[], say: Say, zone: string): readonly Line[] {
  const today = dayOf(say.clock.now(), zone);
  const lines: Line[] = [];
  let before: string | undefined;
  for (const entry of stream) {
    const day = dayOf(entry.at, zone);
    if (day !== before && (before !== undefined || day !== today)) lines.push({ kind: "note", id: `day-${entry.id}`, text: day });
    before = day;
    const line = lineOf(entry, say);
    if (line !== undefined) lines.push(line);
  }
  return lines;
}
