import type { Clock } from "~/modules/page/types.ts";
import type { Entry as Said, RepoItem, RepoItemView } from "~/modules/views-connector/types.ts";
import { dayOf, isToday, whenOf } from "../connectors/when.ts";
import type { Entry, Item, Opened, Standing } from "./data.ts";

const STANDING: Readonly<Record<RepoItem["waits"], Standing>> = {
  us: "us",
  checks: "us",
  person: "person",
  reporter: "person",
  done: "done",
};
const STATE = { open: "Open", merged: "Merged", closed: "Closed" } as const;

/** When it was last touched: the time today, else the day. */
const touched = (at: number, clock: Clock, zone: string): string => (isToday(at, clock, zone) ? clock.time(at) : dayOf(at, zone));

const relatedOf = (i: RepoItem): string | undefined =>
  i.closes !== null
    ? `${i.state === "open" ? "Closes" : "Closed"} #${i.closes}`
    : i.fixedBy !== null && i.state === "open"
      ? `Fixed by #${i.fixedBy}`
      : i.into !== null
        ? `Into #${i.into}`
        : undefined;

export function itemOf(i: RepoItem, clock: Clock, zone: string): Item {
  const related = relatedOf(i);
  return {
    id: String(i.number),
    kind: i.is === "issue" ? "issue" : "pr",
    title: i.title,
    state: STATE[i.state],
    standing: STANDING[i.waits],
    waits: i.says,
    author: i.by,
    opened: whenOf(i.opened, clock, zone),
    at: touched(i.at, clock, zone),
    ...(i.work === null ? {} : { work: i.work }),
    labels: i.labels,
    ...(related === undefined ? {} : { related }),
  };
}

const took = (ms: number): string => {
  const seconds = Math.round(ms / 1000);
  return seconds >= 60 ? `${Math.floor(seconds / 60)} min ${seconds % 60} s` : `${seconds} s`;
};

const entryOf = (e: Said, clock: Clock, zone: string, who: string): Entry | undefined => {
  const at = whenOf(e.at, clock, zone);
  if (e.is === "note") return { kind: "event", id: e.id, at, text: e.text };
  if (e.is === "review") return { kind: "review", id: e.id, by: e.by, at, verdict: e.verdict, body: e.text, threads: e.comments };
  if (e.is === "in") return { kind: "comment", id: e.id, by: e.by, at, body: e.text.split("\n\n") };
  if (e.is === "out")
    return {
      kind: "comment",
      id: e.id,
      by: who,
      at,
      body: e.text.split("\n\n"),
      mine: true,
      ...(e.person ? { as: `${e.by}, as ${who}` } : {}),
    };
  return undefined;
};

/** The open one: what its author wrote, then what happened to it, in order. */
export function openedOf(view: RepoItemView, clock: Clock, zone: string, who: string): Opened {
  const { item } = view;
  const first: Entry = {
    kind: "comment",
    id: "body",
    by: item.by === who ? who : item.by,
    at: whenOf(item.opened, clock, zone),
    body: view.body.split("\n\n"),
    ...(item.by === who ? { mine: true as const } : {}),
  };
  return {
    entries: [first, ...view.stream.flatMap((e) => entryOf(e, clock, zone, who) ?? [])],
    threads: view.comments.map((c) => ({
      id: c.id,
      file: c.path,
      line: c.line,
      hunk: c.hunk,
      answered: c.done,
      comments: c.stream.flatMap((e) =>
        e.is === "in" || e.is === "out"
          ? [{ by: e.is === "out" ? who : e.by, at: clock.time(e.at), body: e.text, ...(e.is === "out" ? { mine: true as const } : {}) }]
          : [],
      ),
    })),
    checks: view.checks.map((c) => ({ name: c.name, result: c.is, took: took(c.took), what: c.says })),
    files: view.files.map((f) => ({ path: f.path, added: f.added, removed: f.gone, patch: f.patch })),
  };
}
