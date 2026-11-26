import type { Clock } from "~/modules/clock/types.ts";
import type { Asking, Kept } from "~/modules/asking/types.ts";
import type { AskWhich, Chosen } from "~/modules/deciding/types.ts";
import { asksStoreOver } from "./asks-store.ts";
import type { Item } from "~/modules/intake/types.ts";

/* Two that fit equally: a person is asked which takes it, and what they say is kept until the item is decided again. */

const DAY = 86_400_000;
const PREFIX = "choose:";
const LEAVE = "leave";

export const isChoice = (ask: string): boolean => ask.startsWith(PREFIX);

/** The ask, once per item: one option for each that fit, and one to leave it. */
export function askWhichOf(asking: Asking, clock: Clock): (input: AskWhich) => Promise<void> {
  return async ({ item, to, between, why }) => {
    const options = [
      ...between.map(({ manager, name, kind, kindName }) => ({
        id: `${manager}:${kind}`,
        label: `${name} as ${kindName}`,
        then: `${name} takes it as ${kindName}.`,
      })),
      { id: LEAVE, label: "Leave it", then: "Nobody takes it." },
    ];
    await asking.handle({
      op: "open",
      input: {
        ask: {
          id: `${PREFIX}${item.id}`,
          to,
          need: "decide",
          about: { thread: item.thread, manager: between[0]?.manager ?? "", title: item.title },
          question: `Who takes "${item.title}"?`,
          why,
          options,
          best: null,
          shows: null,
          by: clock.now() + DAY,
          then: [],
          else: "wait",
        },
        from: between[0]?.name ?? "",
        kind: between[0]?.kind ?? "",
        person: item.actor.person ?? item.actor.name,
        looked: [],
        otherwise: null,
        links: [],
      },
    });
  };
}

const parsed = (value: SqlStorageValue | undefined): Chosen => JSON.parse(String(value)) as Chosen;

/** What a person chose for this item, if they have. */
export function chosenOf(sql: SqlStorage): (item: Item) => Chosen | undefined {
  return (item) => {
    const row = sql.exec("SELECT json FROM console_kept WHERE kind = 'choice' AND id = ?", item.id).toArray()[0];
    return row === undefined ? undefined : parsed(row["json"]);
  };
}

/** The person answered: what they chose is kept, and the item is decided again with it. */
export function chose(sql: SqlStorage, kept: Kept): void {
  const { state } = kept.ask;
  if (state._tag !== "Answered") return;
  const item = kept.ask.id.slice(PREFIX.length);
  const [manager = "", kind = ""] = state.answer === LEAVE ? [] : state.answer.split(":");
  const one: Chosen = { manager, kind, by: state.by, name: state.by };
  sql.exec(
    `INSERT INTO console_kept (kind, id, seq, json) VALUES ('choice', ?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM console_kept), ?)
     ON CONFLICT (kind, id) DO NOTHING`,
    item,
    JSON.stringify(one),
  );
  sql.exec("UPDATE console_item SET decision = NULL, retry = NULL WHERE id = ?", item);
}

/** The ask that is open for the conversation of this item, if one is: a second item of it does not ask again. */
export function waitingOf(sql: SqlStorage): (item: Item) => string | undefined {
  return (item) =>
    asksStoreOver(sql)
      .open()
      .find(({ ask }) => isChoice(ask.id) && ask.about.thread === item.thread && ask.id !== `${PREFIX}${item.id}`)?.ask.id;
}
