import type { Reach } from "~/modules/reach/types.ts";
import type { Clock } from "~/modules/page/types.ts";
import type { IntakeRow, IntakeView } from "~/modules/views-manager/types.ts";
import { capital, dayMonth } from "../manager-frame/words.ts";

/* What the page says of one thing that came in: made of the view's data, with the words people have for it. */

export type State = "ask" | "watch" | "took" | "left";

export interface Came {
  readonly id: string;
  readonly title: string;
  readonly feed: string;
  readonly trigger: string;
  readonly by: IntakeRow["item"]["by"];
  readonly who: string;
  readonly at: number;
  readonly stamp: string;
  readonly isToday: boolean;
  readonly state: State;
  readonly kind: { readonly id: string; readonly name: string } | null;
  readonly why: string;
  readonly gate: string;
  readonly judged: readonly { readonly name: string; readonly is: boolean; readonly why: string }[];
  readonly work: string | null;
  readonly asker: string | null;
  readonly mandate: IntakeRow["mandate"];
  readonly line: readonly { readonly did: string; readonly says: string; readonly time: string }[];
}

export interface Words {
  readonly clock: Clock;
  readonly zone: string;
  readonly first: (person: string) => string;
}

const stateOf = (decision: IntakeRow["decision"]): State =>
  decision._tag === "Asked" ? "ask" : decision._tag === "Left" ? (decision.would === undefined ? "left" : "watch") : "took";

const kindIdOf = (decision: IntakeRow["decision"]): string | null =>
  decision._tag === "Took"
    ? decision.kind
    : decision._tag === "Asked"
      ? (decision.between[0]?.kind ?? null)
      : decision._tag === "Left"
        ? (decision.would?.kind ?? null)
        : null;

/** Who it came from: found by whoever searched, nobody for what became true, else the one who sent it. */
const whoOf = (item: IntakeRow["item"]): string =>
  item.by === "cron" ? `Found by ${item.actor.name}` : item.by === "wait" ? "Nobody: it became true" : item.actor.name;

export function cameOf(row: IntakeRow, view: IntakeView, words: Words): Came {
  const { clock, zone } = words;
  const kindId = kindIdOf(row.decision);
  const kind = view.kinds.find((one) => one.id === kindId);
  const name = (id: string): string => view.kinds.find((one) => one.id === id)?.name ?? id;
  return {
    id: row.item.id,
    title: row.item.title,
    feed: row.from,
    trigger: row.item.trigger,
    by: row.item.by,
    who: whoOf(row.item),
    at: row.item.at,
    stamp: `${dayMonth(row.item.at, zone)}, ${clock.time(row.item.at)}`,
    isToday: dayMonth(row.item.at, zone) === dayMonth(clock.now(), zone),
    state: stateOf(row.decision),
    kind: kind === undefined ? null : { id: kind.id, name: kind.name },
    why: row.decision.why,
    gate: row.decision.gated[0]?.gated.why ?? "",
    judged: row.decision.verdicts.map((one) => ({ name: name(one.kind), is: one.is, why: one.why })),
    work: row.work?.id ?? null,
    asker: row.mandate === null ? null : words.first(row.mandate.by),
    mandate: row.mandate,
    line: row.line.map((one) => ({ did: one.did, says: one.says, time: clock.time(one.at) })),
  };
}

/** What a grant allows, in the words of its ids: `mail.send` that asks is "Send mail, asks". */
export function mayOf(mandate: Pick<Reach, "grants">): string {
  const said = mandate.grants.flatMap((grant) =>
    Object.entries(grant.may)
      .filter(([, permission]) => permission !== "off")
      .map(([id, permission]) => {
        const [where = "", what = id] = id.split(".");
        return `${capital(what)} ${where}${permission === "ask" ? " (asks)" : ""}`;
      }),
  );
  return said.join(", ");
}

/** The limit it works under: dollars for each piece of work, and what is spent. */
export const limitOf = (mandate: NonNullable<IntakeRow["mandate"]>): string => {
  const { perWork } = mandate.mandate.limits;
  const spent = mandate.spent === null ? "" : `spent $${mandate.spent}`;
  return [perWork === undefined ? "" : `$${perWork}`, spent].filter((one) => one !== "").join(", ");
};
