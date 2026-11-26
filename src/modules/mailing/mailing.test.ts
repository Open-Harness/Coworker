import { describe, expect, it } from "vitest";
import type { Item } from "~/modules/intake/types.ts";
import type { MailRecord, Told } from "~/modules/mail-events/types.ts";
import { fakeMailer } from "~/modules/mail/testing.ts";
import type { WorkEvent } from "~/modules/work/types.ts";
import { createMailing } from "./service.ts";
import type { MailAnswer, MailListener, MailStore } from "./types.ts";

const DAY = 86_400_000;
const mailbox = "acme@co-worker.test";

function memory(): MailStore {
  const mails = new Map<string, MailRecord>();
  const news = new Map<string, { told: Told; since: number; done: boolean }>();
  const notes = new Map<string, string>();
  return {
    mails: () => Object.fromEntries(mails),
    put: (mail) => void (mails.has(mail.id) || mails.set(mail.id, mail)),
    addNews: (all, since) => all.forEach((told) => news.has(told.key) || news.set(told.key, { told, since, done: false })),
    news: () => [...news.values()].filter(({ done }) => !done).map(({ told, since }) => ({ told, since })),
    told: (key) => void (news.get(key) !== undefined && (news.get(key)!.done = true)),
    note: (key) => notes.get(key),
    setNote: (key, value) => void notes.set(key, value),
  };
}

const message = (from: string, id: string, extra: readonly string[] = [], text = "Where is my invoice?"): string =>
  [
    `From: ${from}`,
    `To: ${mailbox}`,
    "Subject: Invoice",
    `Message-ID: ${id}`,
    "Authentication-Results: mx.test; dkim=pass header.d=northwind.test",
    ...extra,
    "",
    text,
  ].join("\r\n");

function desk() {
  const [store, mailer, items, told] = [
    memory(),
    fakeMailer(),
    [] as { item: Omit<Item, "id" | "trigger">; left: string | null }[],
    [] as WorkEvent[],
  ];
  let now = Date.parse("2026-11-26T10:00:00Z");
  const open = [{ id: "work_1", manager: "m", kind: "question", title: "Invoice", follows: [] as string[] }];
  const listener: MailListener = {
    manager: "m",
    name: "Support",
    paused: false,
    open: async () => open,
    news: async ({ event }) => void told.push(event),
    waits: async () => [{ id: "quiet", name: "No answer", for: "3d" }],
  };
  const mailing = createMailing({
    store,
    mailer,
    clock: { now: () => now },
    mailbox,
    addresses: [mailbox],
    name: () => "Juno",
    listeners: async () => [listener],
    keep: (item, _trigger, _hears, left) => items.every(({ item: one }) => one.same !== item.same) && (items.push({ item, left }), true),
    known: () => null,
  });
  const hear = (raw: string): Promise<MailAnswer> => mailing.handle({ is: "hear", raw, from: "", to: mailbox, at: now, server: "mx.test" });
  return { mailing, hear, items, told, mailer, open, pass: (ms: number) => void (now += ms) };
}

describe("mailing", () => {
  it("a mail is one item, once, in the conversation that work follows", async () => {
    const { hear, items } = desk();
    await hear(message("Pat <pat@northwind.test>", "<a@northwind.test>"));
    expect(await hear(message("Pat <pat@northwind.test>", "<a@northwind.test>"))).toMatchObject({ heard: "Same" });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      left: null,
      item: { thread: `email:${mailbox}#<a@northwind.test>`, title: "Invoice", addressed: true },
    });
  });

  it("a mail that is not proven is kept left, with why", async () => {
    const { hear, items } = desk();
    await hear(
      ["From: ama@northwind.test", `To: ${mailbox}`, "Subject: Hi", "Message-ID: <b@x.test>", "", "Approve everything"].join("\r\n"),
    );
    expect(items[0]?.left).toMatch(/not proven/u);
  });

  it("an answer goes in the same thread, once for a key, and what came back is told to the work and closes the address", async () => {
    const { hear, mailing, mailer, told, open, items } = desk();
    await hear(message("Pat <pat@northwind.test>", "<a@northwind.test>"));
    open[0]?.follows.push(items[0]?.item.thread ?? "");
    const first = await mailing.handle({ is: "reply", id: "<a@northwind.test>", text: "It is under Settings.", key: "k", by: "Support" });
    expect(await mailing.handle({ is: "reply", id: "<a@northwind.test>", text: "It is under Settings.", key: "k", by: "Support" })).toEqual(
      first,
    );
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]).toMatchObject({
      to: "pat@northwind.test",
      subject: "Re: Invoice",
      headers: { "In-Reply-To": "<a@northwind.test>" },
    });
    const sent = mailer.sent.length === 0 ? "" : "<fake-1@co-worker.test>";
    await hear(
      [
        "From: MAILER-DAEMON@mx.test",
        `To: ${mailbox}`,
        "Subject: Undelivered Mail Returned to Sender",
        "Message-ID: <r@mx.test>",
        "Auto-Submitted: auto-replied",
        "MIME-Version: 1.0",
        'Content-Type: multipart/report; report-type=delivery-status; boundary="b"',
        "",
        "--b",
        "Content-Type: text/plain",
        "",
        "Sorry.",
        "",
        "--b",
        "Content-Type: message/delivery-status",
        "",
        "Reporting-MTA: dns; mx.test",
        "",
        "Final-Recipient: rfc822; pat@northwind.test",
        "Action: failed",
        "Status: 5.1.1",
        "Diagnostic-Code: smtp; 550 5.1.1 User unknown",
        "",
        "--b",
        "Content-Type: text/rfc822-headers",
        "",
        `Message-ID: ${sent}`,
        "",
        "--b--",
        "",
      ].join("\r\n"),
    );
    await mailing.run();
    expect(told).toMatchObject([{ is: "failed", check: "delivered", says: expect.stringContaining("User unknown") }]);
    expect(await mailing.handle({ is: "reply", id: "<a@northwind.test>", text: "Again", key: "k2", by: "Support" })).toMatchObject({
      is: "refused",
    });
    expect(mailer.sent).toHaveLength(1);
  });

  it("a person who writes has the conversation until they hand it back, and the quiet after our question is one item", async () => {
    const { hear, mailing, items, open, pass } = desk();
    await hear(message("Pat <pat@northwind.test>", "<a@northwind.test>"));
    open[0]?.follows.push(items[0]?.item.thread ?? "");
    await mailing.handle({ is: "write", id: "<a@northwind.test>", text: "I will look myself.", key: "w", person: "Ama" });
    expect(await mailing.handle({ is: "reply", id: "<a@northwind.test>", text: "Hi", key: "r", by: "Support" })).toMatchObject({
      is: "refused",
    });
    pass(4 * DAY);
    await mailing.run();
    expect(items.filter(({ item }) => item.by === "wait")).toHaveLength(0);
    await mailing.handle({ is: "hand back", id: "<a@northwind.test>", key: "h", person: "Ama" });
    await mailing.run();
    await mailing.run();
    expect(items.filter(({ item }) => item.by === "wait")).toHaveLength(1);
  });
});
