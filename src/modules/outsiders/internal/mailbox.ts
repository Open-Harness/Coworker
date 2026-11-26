import { isFailure, type Fetch, type MailFailure, type MailPerson, type Polling, type ReceivedMail } from "../types.ts";
import { eventually } from "./eventually.ts";

type Json = Readonly<Record<string, unknown>>;
const isRecord = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): string | null => (typeof value === "string" ? value : null);
const failed = (reason: string): MailFailure => ({ _tag: "Failed", reason });

/** After a send, how long its copy may take to come back. */
const COPY_WAIT: Pick<Polling, "withinMs" | "everyMs"> = { withinMs: 30_000, everyMs: 1_000 };

function receivedOf(value: unknown): readonly ReceivedMail[] {
  if (!isRecord(value) || typeof value["uid"] !== "number") return [];
  return [
    {
      uid: value["uid"],
      messageId: text(value["messageId"]),
      inReplyTo: text(value["inReplyTo"]),
      from: text(value["from"]) ?? "",
      subject: text(value["subject"]) ?? "",
      at: text(value["at"]) ?? "",
    },
  ];
}

/** A mailbox of the `coworker-mailbox` Worker (the mailbox module), as a person who sends mail and reads their inbox. */
export function mailboxPerson(
  settings: { readonly url: string; readonly token: string; readonly address: string },
  fetch: Fetch,
  polling: Pick<Polling, "sleep" | "now">,
): MailPerson {
  const box = `/v1/boxes/${encodeURIComponent(settings.address.toLowerCase())}`;
  const call = async (method: string, path: string, body?: unknown): Promise<Json | MailFailure> => {
    const response = await fetch(`${settings.url.replace(/\/$/u, "")}${box}${path}`, {
      method,
      headers: { authorization: `Bearer ${settings.token}`, "content-type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const parsed: unknown = await response.json().catch(() => ({}));
    if (response.ok && isRecord(parsed)) return parsed;
    return failed(`The mailbox answered ${response.status} to ${method} ${path}`);
  };
  return {
    address: settings.address,
    send: async ({ to, subject, text: body }) => {
      const sent = await call("POST", "/send", { to, subject, text: body });
      if (isFailure(sent)) return sent;
      const messageId = await eventually(
        async () => {
          const found = await call("GET", `/sent/${text(sent["id"]) ?? ""}`);
          return isFailure(found) ? undefined : (text(found["messageId"]) ?? undefined);
        },
        { ...COPY_WAIT, ...polling },
      );
      return messageId === undefined ? failed("The copy of the sent message did not come back") : { subject, messageId };
    },
    inbox: async (subject) => {
      const found = await call("GET", `/messages?${new URLSearchParams({ subject }).toString()}`);
      if (isFailure(found)) return found;
      return Array.isArray(found["messages"]) ? found["messages"].flatMap(receivedOf) : [];
    },
    read: async (uid) => {
      const found = await call("GET", `/messages/${uid}`);
      return isFailure(found) ? found : (text(found["text"]) ?? failed("The message has no text"));
    },
  };
}
