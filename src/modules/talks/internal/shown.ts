import type { Chat, ChatLine } from "~/modules/coworker/types.ts";
import type { ChatView } from "~/modules/views-workspace/types.ts";
import { COWORKER, type ChatLineRow, type ChatRow } from "../types.ts";

const waitsOf = (row: ChatRow) =>
  row.lines.flatMap(({ did = [] }) => did).find(({ state, ask }) => state === "waits for you" && ask !== undefined);

export function chat(row: ChatRow, name: string): Chat {
  const waits = waitsOf(row);
  return {
    id: row.id,
    title: row.title,
    with: name,
    where: "Console",
    last: row.lines.at(-1)?.at ?? row.at,
    state: waits === undefined ? "quiet" : "waits",
    waitsFor: waits?.to ?? null,
    under: row.under ?? null,
    knew: row.knew ?? null,
  };
}

const lineOf = (line: ChatLineRow): ChatView["lines"][number] => ({
  id: line.id,
  at: line.at,
  by: line.by === COWORKER ? COWORKER : { person: line.by },
  text: line.text,
  did: (line.did ?? []).map(({ doing, says, link, state, showMe }): ChatLine["did"][number] => ({
    doing,
    says,
    link,
    state,
    ...(showMe === undefined ? {} : { showMe }),
  })),
  from: line.from ?? [],
  calls: line.calls ?? [],
});

export const view = (row: ChatRow, all: readonly ChatRow[], name: string): ChatView => ({
  chat: chat(row, name),
  lines: row.lines.map(lineOf),
  forks: all
    .filter(({ under }) => under === row.id)
    .map((fork) => ({ ...chat(fork, name), replies: fork.lines.length - (fork.knew ?? 0) })),
});
