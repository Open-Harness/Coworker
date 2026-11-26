import type { Answer } from "~/modules/api/types.ts";
import type { ChatsView, ChatView } from "~/modules/views-workspace/types.ts";
import type { ChatLineRow, ChatRow } from "~/modules/talks/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { answerChat, hearing, heardOf, systemOf } from "./chat-turn.ts";
import { chatOf, ownChat, saveChat, threadOf, viewOf } from "./chat-rows.ts";
import { ok, problem } from "./around.ts";
import { identityOf } from "./shell.ts";

/* A person's chats with the co-worker: started, found, said in, and forked at a line. What the co-worker answers is `chat-turn`'s. */

const TITLE = 60;

const text = (body: unknown, name: string): string => {
  const sent = typeof body === "object" && body !== null ? (body as Readonly<Record<string, unknown>>) : {};
  return typeof sent[name] === "string" ? sent[name].trim() : "";
};

export async function chatsList(c: ConsoleDeps): Promise<ChatsView> {
  const [rows, identity] = await Promise.all([c.store.chats(c.who.id), identityOf(c)]);
  return { chats: rows.map((row) => chatOf(row, identity.name)) };
}

export async function chatView(c: ConsoleDeps, id: string): Promise<Answer<ChatView>> {
  const row = await ownChat(c, id);
  return row === undefined ? problem(404, `There is no chat ${id} of yours.`) : ok(await viewOf(c, row, (await identityOf(c)).name));
}

/** What a person says: kept in the conversation and as a line, and the co-worker answers. A second press with the same key is the first. */
async function hear(c: ConsoleDeps, row: ChatRow, said: string, key: string, place: string): Promise<string> {
  const line: ChatLineRow = { id: `${row.id}:${key}`, by: c.who.id, at: c.clock.now(), text: said };
  if (row.lines.some(({ id }) => id === line.id)) return line.id;
  const thread = threadOf(row.id);
  if ((await c.store.messages(thread)).length === 0) await c.store.addMessage(thread, { role: "system", content: await systemOf(c) });
  await c.store.addMessage(thread, { role: "user", content: heardOf(said, place) });
  await saveChat(c, hearing(row, { ...line, upto: (await c.store.messages(thread)).length }));
  await answerChat(c, row.id, place);
  return line.id;
}

/** A chat is started with what is said first; the same key is the same chat. */
export async function startChat(c: ConsoleDeps, body: unknown): Promise<Answer<{ readonly chat: string }>> {
  const [said, key, place] = [text(body, "text"), text(body, "key"), text(body, "place")];
  if (said === "" || key === "") return problem(422, "Send {text, key}: what you say, and a key that makes a second press the first.");
  const id = `chat_${key}`;
  const known = await ownChat(c, id);
  const row: ChatRow = known ?? {
    id,
    by: c.who.id,
    title: said.length > TITLE ? `${said.slice(0, TITLE).trimEnd()}…` : said,
    at: c.clock.now(),
    lines: [],
  };
  await hear(c, row, said, key, place);
  return ok({ chat: id });
}

export async function sayInChat(c: ConsoleDeps, id: string, body: unknown): Promise<Answer<{ readonly line: string }>> {
  const [said, key, place] = [text(body, "text"), text(body, "key"), text(body, "place")];
  if (said === "" || key === "") return problem(422, "Send {text, key}: what you say, and a key that makes a second press the first.");
  const row = await ownChat(c, id);
  return row === undefined ? problem(404, `There is no chat ${id} of yours.`) : ok({ line: await hear(c, row, said, key, place) });
}

/** A fork knows what the chat knew up to a line, and nothing after it. */
export async function forkChat(c: ConsoleDeps, id: string, body: unknown): Promise<Answer<{ readonly chat: string }>> {
  const row = await ownChat(c, id);
  if (row === undefined) return problem(404, `There is no chat ${id} of yours.`);
  const at = row.lines.findIndex(({ id: line }) => line === text(body, "line"));
  const line = row.lines[at];
  if (line === undefined) return problem(404, "There is no such line in that chat.");
  const fork = c.ids.next("chat");
  const known = (await c.store.messages(threadOf(id))).slice(0, line.upto ?? 0);
  for (const message of known) await c.store.addMessage(threadOf(fork), message);
  await saveChat(c, {
    id: fork,
    by: c.who.id,
    title: row.title,
    at: c.clock.now(),
    lines: row.lines.slice(0, at + 1),
    under: id,
    knew: at + 1,
  });
  return ok({ chat: fork });
}
