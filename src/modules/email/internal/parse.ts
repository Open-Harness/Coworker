import PostalMime from "postal-mime";

/** What the email Source reads from a message. */
export interface ParsedMail {
  readonly from: string;
  readonly fromName: string;
  readonly replyTo: string | undefined;
  readonly subject: string;
  readonly messageId: string | undefined;
  readonly references: readonly string[];
  readonly text: string;
  readonly attachments: readonly { readonly name: string; readonly type: string; readonly bytes: Uint8Array }[];
  /** Domains whose DKIM signature the trusted receiver says passed. */
  readonly dkimPassed: readonly string[];
  /** An out-of-office, a bounce, a list or any other message no person typed to us. */
  readonly automatic: boolean;
}

const ids = (value: string | undefined): string[] => value?.match(/<[^<>\s]+>/gu) ?? [];

/** `Authentication-Results: mx.cloudflare.net; dkim=pass header.d=acme.com …`, from the trusted receiver only. */
function dkimPassed(headers: readonly { key: string; value: string }[], authServId: string): string[] {
  return headers
    .filter(({ key }) => key === "authentication-results" || key === "arc-authentication-results")
    .map(({ value }) => value.replace(/^\s*i=\d+;\s*/u, ""))
    .filter((value) => value.split(";")[0]?.trim().toLowerCase() === authServId.toLowerCase())
    .flatMap((value) =>
      [...value.matchAll(/\bdkim=pass\b[^;]*?\bheader\.d=([a-z0-9.-]+)/giu)].map(([, domain = ""]) => domain.toLowerCase()),
    );
}

const AUTO_FROM = /^(mailer-daemon|postmaster|no-?reply)@/iu;

function automatic(headers: readonly { key: string; value: string }[], from: string): boolean {
  const value = (key: string) =>
    headers
      .find((header) => header.key === key)
      ?.value.trim()
      .toLowerCase();
  const autoSubmitted = value("auto-submitted");
  if (autoSubmitted !== undefined && autoSubmitted !== "no") return true;
  if (["x-autoreply", "x-autorespond", "x-auto-response-suppress", "list-id"].some((key) => value(key) !== undefined)) return true;
  if (/^(bulk|junk|list|auto_reply)$/u.test(value("precedence") ?? "")) return true;
  if (/multipart\/report/u.test(value("content-type") ?? "")) return true;
  return AUTO_FROM.test(from);
}

export async function parseMail(raw: ReadableStream<Uint8Array> | Uint8Array | string, authServId: string): Promise<ParsedMail> {
  const bytes = raw instanceof ReadableStream ? new Uint8Array(await new Response(raw).arrayBuffer()) : raw;
  const email = await PostalMime.parse(bytes, { attachmentEncoding: "arraybuffer" });
  const headers = email.headers.map(({ key, value }) => ({ key, value }));
  const from = (email.from?.address ?? "").toLowerCase();
  const messageId = ids(email.messageId)[0];
  return {
    from,
    fromName: email.from?.name ?? "",
    replyTo: email.replyTo?.[0]?.address?.toLowerCase(),
    subject: email.subject?.trim() || "(no subject)",
    messageId,
    references: [...new Set([...ids(email.references), ...ids(email.inReplyTo)])].filter((id) => id !== messageId),
    text: (email.text ?? "").trim(),
    attachments: email.attachments.map((file) => ({
      name: file.filename ?? "attachment",
      type: file.mimeType,
      bytes: typeof file.content === "string" ? new TextEncoder().encode(file.content) : new Uint8Array(file.content),
    })),
    dkimPassed: dkimPassed(headers, authServId),
    automatic: automatic(headers, from),
  };
}
