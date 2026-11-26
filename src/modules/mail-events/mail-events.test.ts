import { describe, expect, it } from "vitest";
import { mailEvents } from "./service.ts";
import type { MailRecord, Us } from "./types.ts";

const us: Us = { addresses: ["juno@acme.test"], server: "mx.acme.test" };
const at = { from: "", to: "juno@acme.test", at: 0 };
const raw = (...lines: readonly string[]): string => [...lines, "", "Hello"].join("\r\n");

describe("mail-events", () => {
  it("an answer goes to who wrote it, with Re: once", async () => {
    const read = await mailEvents.read(
      raw("From: Pat <pat@x.test>", "To: juno@acme.test", "Subject: Hi", "Message-ID: <a@x.test>"),
      at,
      us,
    );
    if (read._tag !== "Mail") throw new Error("not mail");
    const mails = mailEvents.keep({}, read.mail);
    expect(mailEvents.answer(mails, "<a@x.test>", us)).toMatchObject({ _tag: "Answer", to: ["pat@x.test"], subject: "Re: Hi" });
  });
  it("keeping the same mail again changes nothing", async () => {
    const read = await mailEvents.read(raw("From: Pat <pat@x.test>", "Subject: Hi", "Message-ID: <a@x.test>"), at, us);
    if (read._tag !== "Mail") throw new Error("not mail");
    const once = mailEvents.keep({}, read.mail);
    const changed: MailRecord = { ...read.mail, text: "other" };
    expect(mailEvents.keep(once, changed)).toBe(once);
    expect(mailEvents.told(once, once, us)).toEqual([]);
  });
  it("a mail we sent is not told as written", async () => {
    const read = await mailEvents.read(raw("From: juno@acme.test", "To: pat@x.test", "Message-ID: <o@acme.test>"), at, us);
    if (read._tag !== "Noise") throw new Error("not noise");
    expect(mailEvents.told({}, mailEvents.keep({}, read.mail), us)).toEqual([]);
  });
});
