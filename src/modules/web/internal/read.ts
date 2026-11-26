import type { Refusal, WebDependencies } from "../types.ts";
import { checkResolved } from "./policy.ts";

const MAX_REDIRECTS = 5;
const MAX_BYTES = 2_000_000;
const MAX_CHARACTERS = 30_000;
const READABLE = /^(?:text\/|application\/(?:json|xml|xhtml\+xml|[\w.-]+\+json|[\w.-]+\+xml|javascript))/iu;

export interface Page {
  readonly ok: true;
  readonly url: string;
  readonly status: number;
  readonly title?: string;
  readonly text: string;
  readonly truncated: boolean;
}

async function readLimited(response: Response): Promise<{ readonly text: string; readonly truncated: boolean }> {
  if (response.body === null) return { text: "", truncated: false };
  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let text = "";
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return { text: text + decoder.decode(), truncated: false };
    bytes += value.byteLength;
    text += decoder.decode(value, { stream: true });
    if (bytes > MAX_BYTES) {
      await reader.cancel();
      return { text, truncated: true };
    }
  }
}

const ENTITIES: Readonly<Record<string, string>> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

const decodeEntities = (text: string): string =>
  text.replace(/&(?:#x([0-9a-f]{1,6})|#(\d{1,7})|(\w{2,6}));/giu, (entity, hex, decimal, name) => {
    if (name !== undefined) return ENTITIES[String(name).toLowerCase()] ?? entity;
    const point = hex === undefined ? Number(decimal) : Number.parseInt(String(hex), 16);
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
  });

/** Readable text of an HTML page: markup dropped, block structure kept as line breaks, link targets kept. */
export function htmlText(html: string): { readonly title?: string; readonly text: string } {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/iu.exec(html)?.[1];
  const text = html
    .replace(/<!--[\s\S]*?-->/gu, "")
    .replace(/<(script|style|noscript|svg|template|head)\b[\s\S]*?<\/\1\s*>/giu, "")
    .replace(/<a\b[^>]*?href="(https?:[^"]*)"[^>]*>([\s\S]*?)<\/a>/giu, "$2 ($1)")
    .replace(/<li\b[^>]*>/giu, "\n- ")
    .replace(/<h([1-6])\b[^>]*>/giu, (_tag, level) => `\n\n${"#".repeat(Number(level))} `)
    .replace(/<\/?(?:p|div|section|article|main|header|footer|nav|tr|table|ul|ol|h[1-6]|br|hr|pre|blockquote)\b[^>]*>/giu, "\n")
    .replace(/<[^>]*>/gu, "");
  return {
    ...(title === undefined ? {} : { title: decodeEntities(title).trim() }),
    text: decodeEntities(text)
      .replace(/[ \t]+/gu, " ")
      .replace(/ *\n */gu, "\n")
      .replace(/\n{3,}/gu, "\n\n")
      .trim(),
  };
}

async function toPage(url: string, response: Response): Promise<Page | Refusal> {
  const type = response.headers.get("Content-Type") ?? "text/plain";
  if (!READABLE.test(type)) {
    await response.body?.cancel();
    return { ok: false, reason: `The content type ${type.slice(0, 80)} cannot be read` };
  }
  const body = await readLimited(response);
  const parsed = /html/iu.test(type) ? htmlText(body.text) : { text: body.text };
  return {
    ok: true,
    url,
    status: response.status,
    ...parsed,
    text: parsed.text.slice(0, MAX_CHARACTERS),
    truncated: body.truncated || parsed.text.length > MAX_CHARACTERS,
  };
}

/** Fetches a public page. Redirects are followed by hand, so every hop is checked like the first. */
export async function readPage(text: string, fetcher: WebDependencies["fetch"], signal: AbortSignal): Promise<Page | Refusal> {
  let target = text;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const checked = await checkResolved(target, fetcher);
    if (!checked.ok) return checked;
    const response = await fetcher(checked.url.href, {
      redirect: "manual",
      signal,
      headers: { Accept: "text/html, text/plain;q=0.9, application/json;q=0.8, */*;q=0.1", "User-Agent": "web-fetch/1.0" },
    });
    const location = response.headers.get("Location");
    if (response.status < 300 || response.status >= 400 || location === null) return toPage(checked.url.href, response);
    await response.body?.cancel();
    if (!URL.canParse(location, checked.url)) return { ok: false, reason: "The redirect is not a URL" };
    target = new URL(location, checked.url).href;
  }
  return { ok: false, reason: "There were too many redirects" };
}
