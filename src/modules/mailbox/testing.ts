import type { Clock } from "~/modules/clock/types.ts";
import { addressesOn, createMailbox, openBox } from "./service.ts";
import type { Mailbox, Outgoing, Posted } from "./types.ts";

export interface FakeMailbox extends Mailbox {
  readonly token: string;
  readonly person: string;
  readonly stranger: string;
  /** What was sent, in order. */
  readonly posted: Outgoing[];
  /** What the next sends answer. */
  readonly post: { answer: Posted };
  /** A message arrives, as Email Routing would hand it over. Gives the reason when it is refused. */
  readonly arrive: (to: string, headers: Readonly<Record<string, string>>, text: string) => Promise<string | undefined>;
}

const DOMAIN = "example.test";

/** The whole Worker, over one object's storage for each address, with a post that only records. */
export function fakeMailbox(sql: SqlStorage, clock: Clock, token: string | undefined = "mailbox-token-xyz"): FakeMailbox {
  const posted: Outgoing[] = [];
  const post: FakeMailbox["post"] = { answer: { _tag: "Posted" } };
  const [person, stranger] = addressesOn(DOMAIN);
  let count = 0;
  const box = openBox({ sql, clock });
  // The storage given is the person's; the stranger's box keeps nothing.
  const empty = { keep: async () => {}, list: async () => [], read: async () => null, sending: async () => {}, sent: async () => null };
  const mailbox = createMailbox({
    token,
    domain: DOMAIN,
    addresses: [person, stranger],
    box: (address) => (address === person ? box : empty),
    post: async (mail) => (posted.push(mail), post.answer),
    ids: { next: (prefix) => `${prefix}_${(count += 1)}` },
  });
  return {
    ...mailbox,
    token: token ?? "",
    person,
    stranger,
    posted,
    post,
    arrive: async (to, headers, text) => {
      let refused: string | undefined;
      const lines = Object.entries({ "Content-Type": "text/plain; charset=utf-8", ...headers }).map(([key, value]) => `${key}: ${value}`);
      const raw = new Response(`${lines.join("\r\n")}\r\n\r\n${text}\r\n`).body ?? new ReadableStream<Uint8Array>();
      await mailbox.email({ to, raw, setReject: (reason) => void (refused = reason) });
      return refused;
    },
  };
}
