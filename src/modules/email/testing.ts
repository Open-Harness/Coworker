import type { FileStore } from "~/modules/triggers/types.ts";

/** Files kept in memory, for the fake world. */
export function memoryFiles(): FileStore & { readonly keys: () => readonly string[] } {
  const files = new Map<string, Uint8Array>();
  return {
    put: async (key, body) => void files.set(key, body),
    get: async (key) => files.get(key),
    keys: () => [...files.keys()],
  };
}

/** The one store the fake world's Worker keeps attachments in, so a test can look. */
export const fakeFiles = memoryFiles();

/** The receiving MTA the fake world trusts, as `Authentication-Results` names it. */
export const FAKE_AUTHSERV = "mx.cloudflare.net";

/** A message as a client would send it. `dkim` adds a passing result for the sender's domain. */
export function eml(input: {
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly messageId: string;
  readonly dkim?: boolean;
  readonly headers?: Readonly<Record<string, string>>;
}): string {
  const domain = input.from.slice(input.from.lastIndexOf("@") + 1);
  const headers: Record<string, string> = {
    ...(input.dkim === false ? {} : { "Authentication-Results": `${FAKE_AUTHSERV}; dkim=pass header.d=${domain}; spf=pass` }),
    From: input.from,
    To: input.to,
    Subject: input.subject,
    "Message-ID": input.messageId,
    Date: "Mon, 23 Nov 2026 10:00:00 +0000",
    "Content-Type": "text/plain; charset=utf-8",
    ...input.headers,
  };
  return `${Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\r\n")}\r\n\r\n${input.text}\r\n`;
}
