import type { Asking } from "~/modules/asking/types.ts";
import { asksStoreOver } from "./asks-store.ts";

/* Each morning each person who has something waiting is told what, once: a `know` ask of the co-worker, which they read and are done with. */

const DAY = 86_400_000;
const NAME = "morning.day";

const dayOf = (at: number): number => Math.floor(at / DAY);

/** When the next morning is, from the clock's now. */
export const untilMorning = (now: number): number => (dayOf(now) + 1) * DAY - now;

function lastDay(sql: SqlStorage, began: number): number {
  const row = sql.exec("SELECT value FROM console_setting WHERE name = ?", NAME).toArray()[0];
  return row === undefined ? dayOf(began) : Number(JSON.parse(String(row["value"])));
}

/** The day the workspace began is not a morning after it; each later day is, the first time anything wakes on it. */
export async function morningList(sql: SqlStorage, asking: Asking, now: number, began: number): Promise<void> {
  const today = dayOf(now);
  if (today <= lastDay(sql, began)) return;
  sql.exec(
    "INSERT INTO console_setting (name, value) VALUES (?, ?) ON CONFLICT (name) DO UPDATE SET value = excluded.value",
    NAME,
    JSON.stringify(today),
  );
  const waiting = asksStoreOver(sql)
    .open()
    .filter(({ ask }) => ask.need !== "know");
  for (const person of new Set(waiting.map(({ ask }) => ask.to))) {
    const theirs = waiting.filter(({ ask }) => ask.to === person);
    await asking.handle({
      op: "open",
      input: {
        ask: {
          id: `morning:${today}:${person}`,
          to: person,
          need: "know",
          about: { manager: "", title: "This morning" },
          question: `${theirs.length === 1 ? "One thing waits" : `${theirs.length} things wait`} for you: ${theirs.map(({ ask }) => ask.question).join(" / ")}`,
          why: "It is the list of what waits for you, made each morning.",
          options: [{ id: "ok", label: "Got it", then: "Nothing more is done." }],
          best: null,
          shows: null,
          by: null,
          then: [],
          else: "wait",
        },
        from: "Juno",
        kind: "morning",
        person,
        looked: [],
        otherwise: null,
        links: [{ label: "Your inbox", link: "/inbox" }],
      },
    });
  }
}
