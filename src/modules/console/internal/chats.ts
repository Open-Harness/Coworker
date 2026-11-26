import type { Chat } from "~/modules/coworker/types.ts";
import type { ChatsView } from "~/modules/views-workspace/types.ts";
import type { ChatRow, ConsoleDeps } from "../types.ts";
import { identityOf } from "./shell.ts";
import { ok, problem } from "./around.ts";

/* A person's chats with the co-worker, as far as being started and found: what the co-worker answers is its own module's. */

const TITLE = 60;

const chatOf = (row: ChatRow, name: string): Chat => ({
  id: row.id,
  title: row.title,
  with: name,
  where: "Console",
  last: row.lines.at(-1)?.at ?? row.at,
  state: "quiet",
  waitsFor: null,
  under: null,
  knew: null,
});

export async function chatsList(c: ConsoleDeps): Promise<ChatsView> {
  const [rows, identity] = await Promise.all([c.store.chats(c.who.id), identityOf(c)]);
  return { chats: rows.map((row) => chatOf(row, identity.name)) };
}

/** A chat is started with what is said first; the same key is the same chat. */
export async function startChat(c: ConsoleDeps, body: unknown) {
  const sent = typeof body === "object" && body !== null ? (body as Readonly<Record<string, unknown>>) : {};
  const [said, key] = [typeof sent["text"] === "string" ? sent["text"].trim() : "", typeof sent["key"] === "string" ? sent["key"] : ""];
  if (said === "" || key === "") return problem(422, "Send {text, key}: what you say, and a key that makes a second press the first.");
  const id = `chat_${key}`;
  const known = (await c.store.chats(c.who.id)).find((one) => one.id === id);
  if (known === undefined) {
    const at = c.clock.now();
    await c.store.addChat({
      id,
      by: c.who.id,
      title: said.length > TITLE ? `${said.slice(0, TITLE).trimEnd()}…` : said,
      at,
      lines: [{ id: `${id}_1`, by: c.who.id, at, text: said }],
    });
    await c.store.changed(["/chats", "/shell"]);
  }
  return ok({ chat: id });
}
