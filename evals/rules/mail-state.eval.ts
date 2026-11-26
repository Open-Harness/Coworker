import { describe, expect, it } from "vitest";
import { mailEvents as mail } from "~/modules/mail-events/service.ts";
import type { MailRecord, Mails, Read } from "~/modules/mail-events/types.ts";

/* One mail at a time. */

const OURS = "juno@acme.co-worker.test";
const us = { addresses: [OURS, "support@acme.example"], server: "mx.cloudflare.net" };
const AT = Date.UTC(2026, 10, 25, 9, 0);
interface Written {
  readonly from?: string;
  readonly to?: string;
  readonly subject?: string;
  readonly id?: string | null;
  readonly minute?: number;
  readonly headers?: readonly string[];
  readonly text?: string;
  readonly type?: string;
}
const raw = ({ from = "Pat Reyes <pat@northwind.example>", to = `Juno <${OURS}>`, subject = "Where is my invoice?", id = "<a1@northwind.example>", minute = 0, headers = [], text = "Hello,\n\nwhere is it?", type = "text/plain; charset=utf-8" }: Written = {}): string =>
  [...headers, `From: ${from}`, `To: ${to}`, `Subject: ${subject}`, `Date: ${new Date(AT + minute * 60_000).toUTCString()}`, ...(id === null ? [] : [`Message-ID: ${id}`]), "MIME-Version: 1.0", `Content-Type: ${type}`, "", text].join("\r\n");
const read = (written: Written = {}): Promise<Read> => mail.read(raw(written), { from: "pat@northwind.example", to: OURS, at: AT }, us);
const of = async (written: Written = {}): Promise<MailRecord> => {
  const got = await read(written);
  if (got._tag === "Broken") throw new Error(got.why);
  return got.mail;
};
const kept = async (...all: readonly Written[]): Promise<Mails> => (await Promise.all(all.map(of))).reduce<Mails>((was, one) => mail.keep(was, one), {});
const sent = (more: Written = {}): Written => ({ from: `Juno <${OURS}>`, to: "pat@northwind.example", subject: "Re: Where is my invoice?", id: "<o1@acme.co-worker.test>", minute: 1, headers: ["In-Reply-To: <a1@northwind.example>", "References: <a1@northwind.example>"], ...more });
const report = (action: string, status: string, says: string, more: Written = {}): Written => ({
  from: "MAILER-DAEMON@mx.northwind.example", subject: action === "delayed" ? "Delayed Mail" : "Undelivered Mail Returned to Sender", id: `<r-${action}@mx.northwind.example>`, minute: 2, type: 'multipart/report; report-type=delivery-status; boundary="b"', headers: ["Return-Path: <>", "Auto-Submitted: auto-replied"],
  text: ["--b", "Content-Type: text/plain", "", "I am sorry.", "", "--b", "Content-Type: message/delivery-status", "", "Reporting-MTA: dns; mx.northwind.example", "", "Final-Recipient: rfc822; pat@northwind.example", `Action: ${action}`, `Status: ${status}`, `Diagnostic-Code: smtp; ${says}`, "", "--b", "Content-Type: text/rfc822-headers", "", "Message-ID: <o1@acme.co-worker.test>", "Subject: Re: Where is my invoice?", "", "--b--", ""].join("\r\n"),
  ...more,
});

describe("reading", () => {
  it("rules:mail-events/what-is-new-in-it-without-what-it-answers", async () => {
    const text = async (words: string) => (await of({ text: words })).text;
    expect(await text("Yes please.\n\nOn Tue, 24 Nov 2026 at 10:00, Juno <juno@acme.co-worker.test> wrote:\n> Shall I send it?\n>\n> Juno")).toBe("Yes please.");
    expect(await text("Yes please.\n\nOn Tuesday, 24 November 2026 at 10:00, Juno the co-worker\n<juno@acme.co-worker.test> wrote:\n\n> Shall I send it?")).toBe("Yes please.");
    expect(await text("Ja, bitte.\n\nAm Di., 24. Nov. 2026 um 10:00 Uhr schrieb Juno <juno@acme.co-worker.test>:\n> Soll ich?")).toBe("Ja, bitte.");
    expect(await text("Yes.\r\n\r\n-----Original Message-----\r\nFrom: Juno\r\nSent: Tuesday\r\n\r\nShall I?")).toBe("Yes.");
    expect(await text("> Which one?\nThe one of May.\n> And the date?\nThe 3rd.")).toBe("The one of May.\nThe 3rd.");
    expect(await text("Thanks\n\n-- \nPat Reyes\nNorthwind")).toBe("Thanks");
    expect(await text("I wrote: that on Monday.\nIt is still wrong.")).toBe("I wrote: that on Monday.\nIt is still wrong.");
    expect((await of({ text: "Yes.\n\n> no" })).whole).toContain("> no");
  });
  it("rules:mail-events/html-alone-is-read-as-words", async () => {
    const got = await of({ type: "text/html; charset=utf-8", text: "<style>p{color:red}</style><p>Hello&nbsp;&amp; welcome</p><p>Where is <b>it</b>?</p>" });
    expect(got.text.replaceAll(/\s+/gu, " ")).toBe("Hello & welcome Where is it?");
  });
  it("rules:mail-events/only-what-our-own-server-said-first-proves-who-it-is", async () => {
    const proven = async (...headers: readonly string[]) => (await of({ headers })).proof.proven;
    expect(await proven()).toBe(false);
    expect(await proven("Authentication-Results: mx.cloudflare.net; dkim=pass header.d=northwind.example header.s=k1")).toBe(true);
    expect(await proven("Authentication-Results: mx.cloudflare.net;\r\n dkim=pass header.d=mail.northwind.example;\r\n spf=pass smtp.mailfrom=bounce.northwind.example")).toBe(true);
    expect(await proven("Authentication-Results: mx.cloudflare.net; dkim=none; dmarc=pass header.from=northwind.example")).toBe(true);
    expect(await proven("Authentication-Results: mx.cloudflare.net; dkim=pass header.d=evil.example")).toBe(false);
    expect(await proven("Authentication-Results: mx.cloudflare.net; dkim=pass header.d=notnorthwind.example")).toBe(false);
    expect(await proven("Authentication-Results: mx.cloudflare.net; dkim=fail header.d=northwind.example; spf=pass smtp.mailfrom=northwind.example")).toBe(false);
    expect(await proven("Authentication-Results: mx.evil.example; dkim=pass header.d=northwind.example")).toBe(false);
    // Above and below count; an ending that anyone can have a name under does not.
    const from = async (sender: string, d: string) => (await of({ from: sender, headers: [`Authentication-Results: mx.cloudflare.net; dkim=pass header.d=${d}`] })).proof.proven;
    expect([await from("pat@mail.northwind.example", "northwind.example"), await from("pat@northwind.co.uk", "mail.northwind.co.uk")]).toEqual([true, true]);
    expect([await from("pat@northwind.co.uk", "evil.co.uk"), await from("pat@northwind.co.uk", "co.uk"), await from("pat@northwind.example", "example"), await from("pat@northwind.com.au", "com.au")]).toEqual([false, false, false, false]);
    // Ours is put on top. What is under it came with the mail.
    expect(await proven("Authentication-Results: mx.cloudflare.net; dkim=none", "Authentication-Results: mx.cloudflare.net; dkim=pass header.d=northwind.example")).toBe(false);
    expect((await of({ headers: ["Authentication-Results: mx.cloudflare.net; dkim=pass (dkim=pass header.d=northwind.example) header.d=evil.example"] })).proof.proven).toBe(false);
    expect((await of({ headers: ["Authentication-Results: mx.cloudflare.net; dkim=none; dmarc=fail header.from=northwind.example"] })).proof).toMatchObject({ proven: false, refused: true });
  });
  it("rules:mail-events/what-nobody-typed-is-noise-and-an-invite-is-not", async () => {
    expect(await read({ headers: ["List-Id: <dev.example>"] })).toMatchObject({ _tag: "Noise", mail: { is: "list" } });
    for (const headers of [["Auto-Submitted: auto-generated"], ["Precedence: bulk"], ["List-Unsubscribe: <https://x.example/u>"]]) expect(await read({ headers }), headers[0]).toMatchObject({ _tag: "Noise", mail: { is: "machine" } });
    expect(await read({ from: "no-reply@shop.example" })).toMatchObject({ _tag: "Noise" });
    expect(await read({ headers: ["Auto-Submitted: no"] })).toMatchObject({ _tag: "Mail", mail: { is: "person" } });
    expect(await read({ headers: ["Auto-Submitted: auto-replied"], subject: "Out of office" })).toMatchObject({ _tag: "Mail", mail: { is: "away" } });
    expect(await read({ type: 'multipart/alternative; boundary="b"', text: "--b\r\nContent-Type: text/plain\r\n\r\nA meeting\r\n--b\r\nContent-Type: text/calendar; method=REQUEST\r\n\r\nBEGIN:VCALENDAR\r\nMETHOD:REQUEST\r\nEND:VCALENDAR\r\n--b--\r\n" })).toMatchObject({ _tag: "Mail", mail: { is: "invite" } });
  });
  it("rules:mail-events/ours-coming-back-is-noise-whichever-address-of-ours", async () => {
    expect(await read({ from: `Juno <${OURS.toUpperCase()}>` })).toMatchObject({ _tag: "Noise" });
    expect(await read({ from: "support@acme.example" })).toMatchObject({ _tag: "Noise" });
    expect(await read({ from: "someone@acme.example" })).toMatchObject({ _tag: "Mail" });
  });
  it("rules:mail-events/without-an-id-the-same-mail-twice-is-still-one", async () => {
    const [one, two, other] = [await of({ id: null }), await of({ id: null }), await of({ id: null, text: "Something else" })];
    expect(one.id).toBe(two.id);
    expect(other.id).not.toBe(one.id);
  });
  it("rules:mail-events/never-throws-whatever-comes", async () => {
    const odd = ["", "\r\n\r\n", "no headers at all", `${raw({ type: 'multipart/mixed; boundary="b"' })}\r\n--b\r\n`, raw({ from: "", subject: "=?utf-8?Q?=FF?=" }), raw({ text: "\u0000\u0001" }), new Uint8Array([255, 254, 0, 1, 2])];
    for (const one of odd) expect(["Mail", "Noise", "Broken"]).toContain((await mail.read(one, { from: "", to: OURS, at: AT }, us))._tag);
    expect((await mail.read("", { from: "", to: OURS, at: AT }, us))._tag).toBe("Broken");
    const undated = await mail.read(raw().replace(/Date: .*\r\n/u, "Date: yesterday\r\n"), { from: "", to: OURS, at: AT + 5 }, us);
    expect(undated).toMatchObject({ _tag: "Mail", mail: { at: AT + 5 } });
  });
});

describe("what became of ours", () => {
  it("rules:mail-events/late-may-still-arrive-and-failed-stays", async () => {
    const [first, second] = [{}, sent()];
    const state = async (...all: readonly Written[]) => mail.conversationOf(await kept(first, second, ...all), "<o1@acme.co-worker.test>", us)?.sent["<o1@acme.co-worker.test>"];
    const [late, arrived, failed] = [report("delayed", "4.4.1", "450 try later"), report("delivered", "2.0.0", "250 ok"), report("failed", "5.1.1", "550 5.1.1 User unknown")];
    expect(await state()).toBe("sent");
    expect(await state(late)).toBe("late");
    expect([await state(late, arrived), await state(arrived, late)]).toEqual(["delivered", "delivered"]);
    expect([await state(failed, { ...late, minute: 5 }), await state(arrived, { ...late, minute: 5 }), await state(failed, { ...arrived, minute: 6 })]).toEqual(["failed", "delivered", "failed"]);
    expect([await state(late, failed), await state(failed, late), await state(failed, arrived)]).toEqual(["failed", "failed", "failed"]);
  });
  it("rules:mail-events/only-a-wrong-address-and-a-complaint-close-it", async () => {
    const closed = async (...all: readonly Written[]) => mail.conversationOf(await kept({}, sent(), ...all), "<a1@northwind.example>", us)?.closedTo;
    expect(await closed(report("failed", "5.1.1", "550 5.1.1 User unknown"))).toEqual(["pat@northwind.example"]);
    expect(await closed(report("failed", "5.2.2", "552 5.2.2 Mailbox full"))).toEqual([]);
    expect(await closed(report("failed", "5.7.1", "550 5.7.1 Message refused as spam"))).toEqual([]);
    expect(await closed(report("failed", "5.3.4", "552 5.3.4 Message too big"))).toEqual([]);
    expect(await closed(report("delayed", "4.4.1", "450 try later"))).toEqual([]);
    const complaint: Written = { from: "feedback@isp.example", subject: "Abuse report", id: "<c1@isp.example>", minute: 3, type: 'multipart/report; report-type=feedback-report; boundary="b"', text: "--b\r\nContent-Type: text/plain\r\n\r\nAn abuse report\r\n--b\r\nContent-Type: message/feedback-report\r\n\r\nFeedback-Type: abuse\r\nVersion: 1\r\nOriginal-Rcpt-To: pat@northwind.example\r\n\r\n--b\r\nContent-Type: message/rfc822\r\n\r\nMessage-ID: <o1@acme.co-worker.test>\r\nTo: pat@northwind.example\r\n\r\nHello\r\n--b--\r\n" };
    expect(await closed(complaint)).toEqual(["pat@northwind.example"]);
  });
  it("rules:mail-events/a-report-belongs-to-the-conversation-of-what-it-is-about", async () => {
    const all = await kept({}, sent(), report("failed", "5.1.1", "550 5.1.1 User unknown"));
    expect(mail.conversations(all, us)).toHaveLength(1);
    expect(mail.conversations(all, us)[0]).toMatchObject({ id: "<a1@northwind.example>", people: ["pat@northwind.example"], waits: "nobody" });
  });
  it("rules:mail-events/a-report-about-what-we-never-sent-is-told-to-nobody", async () => {
    const before = await kept({});
    expect(mail.told(before, mail.keep(before, await of(report("failed", "5.1.1", "550 User unknown"))), us)).toEqual([]);
    // Nor about a mail of theirs, which we have because they sent it to us too.
    const theirs = await kept({}, sent({ from: "Pat Reyes <pat@northwind.example>" }));
    expect(mail.told(theirs, mail.keep(theirs, await of(report("failed", "5.1.1", "550 User unknown"))), us)).toEqual([]);
  });
});

describe("whose turn it is", () => {
  it("rules:mail-events/an-away-notice-is-not-an-answer", async () => {
    const away: Written = { id: "<w1@northwind.example>", minute: 2, subject: "Automatic reply: Re: Where is my invoice?", headers: ["Auto-Submitted: auto-replied", "In-Reply-To: <o1@acme.co-worker.test>"], text: "I am away until Monday." };
    const waits = async (...all: readonly Written[]) => mail.conversationOf(await kept(...all), "<a1@northwind.example>", us)?.waits;
    expect(await waits({})).toBe("us");
    expect(await waits({}, sent())).toBe("them");
    expect(await waits({}, sent(), away)).toBe("them");
    expect(await waits({}, sent(), { id: "<a2@northwind.example>", minute: 4, headers: ["In-Reply-To: <o1@acme.co-worker.test>"] })).toBe("us");
    const before = await kept({}, sent());
    expect(mail.told(before, await kept({}, sent(), away), us)).toMatchObject([{ is: "away", who: "pat@northwind.example", conversation: "<a1@northwind.example>" }]);
  });
  it("rules:mail-events/an-answer-before-what-it-answers-is-the-same-conversation-in-the-end", async () => {
    const answer: Written = { id: "<a2@northwind.example>", minute: 4, headers: ["In-Reply-To: <o1@acme.co-worker.test>", "References: <a1@northwind.example> <o1@acme.co-worker.test>"] };
    expect(mail.conversations(await kept(answer), us)[0]).toMatchObject({ id: "<a1@northwind.example>", mails: ["<a2@northwind.example>"] });
    expect(mail.conversations(await kept(answer, sent(), {}), us)).toEqual(mail.conversations(await kept({}, sent(), answer), us));
    // The same subject from somebody else is not the same conversation.
    expect(mail.conversations(await kept({}, { id: "<z@other.example>", from: "zoe@other.example" }), us)).toHaveLength(2);
  });
});

describe("answering", () => {
  it("rules:mail-events/goes-to-reply-to-in-the-thread-and-never-to-us", async () => {
    const all = await kept({ to: `Juno <${OURS}>, support@acme.example, bo@acme.example`, headers: ["Reply-To: billing@northwind.example", "Cc: ines@northwind.example, JUNO@acme.co-worker.test", "References: <r0@northwind.example>"] });
    expect(mail.answer(all, "<a1@northwind.example>", us)).toEqual({ _tag: "Answer", to: ["billing@northwind.example"], cc: ["bo@acme.example", "ines@northwind.example"], subject: "Re: Where is my invoice?", inReplyTo: "<a1@northwind.example>", refs: ["<r0@northwind.example>", "<a1@northwind.example>"], autoSubmitted: null });
    const again = await kept({ subject: "RE: Where is my invoice?" });
    expect(mail.answer(again, "<a1@northwind.example>", us)).toMatchObject({ subject: "RE: Where is my invoice?" });
  });
  it("rules:mail-events/never-a-machine-a-list-an-away-notice-or-who-it-is-closed-to", async () => {
    for (const headers of [["List-Id: <dev.example>"], ["Auto-Submitted: auto-replied"], ["Precedence: bulk"]]) expect(mail.answer(await kept({ headers }), "<a1@northwind.example>", us)._tag, headers[0]).toBe("No");
    expect(mail.answer(await kept({}, sent(), report("failed", "5.1.1", "550 5.1.1 User unknown")), "<a1@northwind.example>", us)._tag).toBe("No");
    expect(mail.answer(await kept({ headers: [`Reply-To: ${OURS}`] }), "<a1@northwind.example>", us)._tag).toBe("No");
    expect(mail.answer({}, "<nothing@x.example>", us)._tag).toBe("No");
  });
  it("rules:mail-events/following-up-on-ours-goes-to-whom-it-went", async () => {
    expect(mail.answer(await kept({}, sent()), "<o1@acme.co-worker.test>", us)).toMatchObject({ _tag: "Answer", to: ["pat@northwind.example"], inReplyTo: "<o1@acme.co-worker.test>" });
  });
  it("rules:mail-events/as-an-event-of-the-work-that-follows-it", async () => {
    const [before, after] = [await kept({}, sent()), await kept({}, sent(), { id: "<a2@northwind.example>", minute: 4, headers: ["In-Reply-To: <o1@acme.co-worker.test>"] })];
    const at = { account: OURS, place: OURS };
    expect(mail.told(before, after, us).map((one) => mail.asWork(one, at))).toMatchObject([{ is: "heard", from: { connector: "email", id: "<a1@northwind.example>" } }]);
    const back = await kept({}, sent(), report("failed", "5.1.1", "550 5.1.1 User unknown"));
    expect(mail.told(before, back, us).map((one) => mail.asWork(one, at))).toMatchObject([{ is: "failed", by: "connector", says: expect.stringContaining("User unknown") }]);
    expect(mail.told(back, back, us)).toEqual([]);
  });
});
