import PostalMime, { type Email } from "postal-mime";

export interface Header {
  readonly key: string;
  readonly value: string;
}

/** A message as MIME gives it, and the words of every part that is words. */
export interface Parsed {
  readonly email: Email;
  /** The bytes as text, for what only the bytes show. */
  readonly raw: string;
  readonly headers: readonly Header[];
  readonly parts: readonly { readonly type: string; readonly name: string; readonly text: string; readonly bytes: Uint8Array }[];
}

const TEXTUAL = /^(?:text\/|message\/)/iu;

function bytesOf(content: string | ArrayBuffer | Uint8Array): Uint8Array {
  return typeof content === "string" ? new TextEncoder().encode(content) : new Uint8Array(content);
}

export function header(parsed: Pick<Parsed, "headers">, key: string): string | undefined {
  return parsed.headers.find((one) => one.key === key)?.value;
}

/** Throws only if MIME itself cannot be read: the caller turns that into `Broken`. */
export async function parse(raw: string | Uint8Array): Promise<Parsed> {
  const email = await PostalMime.parse(raw);
  const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
  const parts = email.attachments.map((file) => {
    const bytes = bytesOf(file.content);
    return {
      type: file.mimeType.toLowerCase(),
      name: file.filename ?? "",
      text: TEXTUAL.test(file.mimeType) ? new TextDecoder().decode(bytes) : "",
      bytes,
    };
  });
  return { email, raw: text, headers: email.headers.map(({ key, value }) => ({ key, value })), parts };
}
