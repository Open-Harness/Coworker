import { COPY_HEADER, type Box, type MailboxDependencies } from "../types.ts";

const said = (status: number, error: string): Response => Response.json({ error }, { status });
const NOT_FOUND = "There is nothing here";
const ADDRESS = /^[^\s@<>,;:"]+@([a-z0-9.-]+)$/u;
const PATH = /^\/v1\/boxes\/([^/]+)\/([a-z]+)(?:\/([\w-]+))?$/u;

const digest = async (value: string): Promise<Uint8Array> =>
  new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));

/** Compares digests to the end, so the time taken says nothing about the token. */
async function allowed(request: Request, token: string | undefined): Promise<boolean> {
  if (token === undefined || token === "") return false;
  const [given, wanted] = await Promise.all([digest(request.headers.get("authorization") ?? ""), digest(`Bearer ${token}`)]);
  return wanted.reduce((different, byte, at) => different | (byte ^ (given[at] ?? 0)), 0) === 0;
}

const textOf = (body: unknown, key: string): string => {
  const value: unknown = typeof body === "object" && body !== null ? Reflect.get(body, key) : undefined;
  return typeof value === "string" ? value.trim() : "";
};

async function send(deps: MailboxDependencies, from: string, body: unknown): Promise<Response> {
  const [to, subject, text] = [textOf(body, "to").toLowerCase(), textOf(body, "subject"), textOf(body, "text")];
  const domain = ADDRESS.exec(to)?.[1];
  if (domain === undefined || subject === "" || text === "") return said(400, "A message has one address, a subject and a text");
  // Only the test domain's own addresses: this must not be a way to mail strangers.
  if (domain !== deps.domain && !domain.endsWith(`.${deps.domain}`)) return said(403, "Only the test domain's own addresses get mail");
  const id = deps.ids.next("sent");
  await deps.box(from).sending(id);
  const posted = await deps.post({ from, to, bcc: from, subject, text, headers: { [COPY_HEADER]: id } });
  return posted._tag === "Posted" ? Response.json({ id }, { status: 202 }) : said(502, posted.reason);
}

async function look(box: Box, what: string, id: string | undefined, subject: string): Promise<Response> {
  if (what === "messages" && id === undefined) return Response.json({ messages: await box.list(subject) });
  if (what === "messages") {
    const text = await box.read(Number(id));
    return text === null ? said(404, NOT_FOUND) : Response.json({ text });
  }
  if (what === "sent" && id !== undefined) {
    const messageId = await box.sent(id);
    return messageId === null ? said(404, "Its copy has not come back yet") : Response.json({ messageId });
  }
  return said(404, NOT_FOUND);
}

export async function answer(deps: MailboxDependencies, request: Request): Promise<Response> {
  if (!(await allowed(request, deps.token))) return said(401, "The token is missing or wrong");
  const url = new URL(request.url);
  const [, address = "", what = "", id] = PATH.exec(url.pathname) ?? [];
  const owner = deps.addresses.find((one) => one === address || encodeURIComponent(one) === address);
  if (owner === undefined) return said(404, NOT_FOUND);
  if (request.method === "GET") return look(deps.box(owner), what, id, url.searchParams.get("subject") ?? "");
  if (request.method === "POST" && what === "send" && id === undefined)
    return send(deps, owner, await request.json().catch(() => undefined));
  return said(405, "That cannot be done here");
}
