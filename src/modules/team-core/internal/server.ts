import type { Decode, Loaded, Send, Server } from "../types.ts";
import { isRecord, wordsOf } from "./narrow.ts";

/** `HeldByAnother` reads "Held by another". */
const spoken = (tag: string): string => {
  const words = tag.replace(/[A-Z]/gu, (letter) => ` ${letter.toLowerCase()}`).trim();
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
};

/** The server says why in `error` (ours), `reason` (a tagged result), `message` (Better Auth), or only by the tag. */
function failureOf(body: unknown, status: number): string {
  if (!isRecord(body)) return `The server answered ${status}`;
  const said = wordsOf(body["error"]) ?? wordsOf(body["reason"]) ?? wordsOf(body["message"]);
  const tag = wordsOf(body["_tag"]);
  return said ?? (tag === undefined ? `The server answered ${status}` : spoken(tag));
}

async function ask<T>(send: Send, path: string, decode: Decode<T>, init?: RequestInit): Promise<Loaded<T>> {
  try {
    const response = await send(path, init);
    const body: unknown = await response.json().catch(() => undefined);
    if (!response.ok) return { _tag: "Failed", message: failureOf(body, response.status) };
    const value = decode(body);
    return value === undefined ? { _tag: "Failed", message: "The server's answer made no sense" } : { _tag: "Loaded", value };
  } catch {
    return { _tag: "Failed", message: "The server could not be reached" };
  }
}

export const createServer = (send: Send, origin = ""): Server => ({
  origin,
  read: (path, decode) => ask(send, path, decode),
  write: (method, path, body, decode) =>
    ask(send, path, decode, {
      method,
      ...(body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
    }),
  upload: (path, file, decode) => ask(send, path, decode, { method: "PUT", headers: { "content-type": file.type }, body: file }),
});
