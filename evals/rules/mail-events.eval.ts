import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mailEvents as mail } from "~/modules/mail-events/service.ts";
import type { MailRecord, Mails, Read } from "~/modules/mail-events/types.ts";
import list from "./data/real/list.json" with { type: "json" };
import { shuffled } from "./github-trace.ts";

/* On what mail servers really send, and a month of a real list. */

const us = { addresses: ["juno@acme.co-worker.test"], server: "mx.cloudflare.net" };
const DIR = new URL("data/real/mail/", import.meta.url);
const FILES = readdirSync(DIR).filter((name) => name.endsWith(".eml"));
const at = { from: "", to: "juno@acme.co-worker.test", at: Date.UTC(2026, 10, 25) };
const read = (name: string): Promise<Read> => mail.read(readFileSync(new URL(name, DIR)), at, us);
const reported = async (name: string) => {
  const got = await read(name);
  if (got._tag === "Broken") throw new Error(`${name}: ${got.why}`);
  return got.mail;
};
/** What the report itself says, where it says it for machines. */
const said = (raw: string) => {
  const from = raw.search(/^content-type:\s*message\/(?:global-)?delivery-status/imu);
  if (from < 0) return [];
  return raw.slice(from).split(/\r?\n\r?\n/u).flatMap((block) => {
    const [action, to] = [/^Action:\s*(\w+)/imu.exec(block)?.[1]?.toLowerCase(), /^Final-Recipient:\s*(?:[\w-]+;)?\s*<?([^\s<>]+@[^\s<>]+?)>?\s*$/imu.exec(block)?.[1]?.toLowerCase()];
    return action === undefined || to === undefined ? [] : [{ is: action === "failed" ? "failed" : action === "delayed" ? "late" : "delivered", to }];
  });
};

describe("what comes back", () => {
  it("rules:mail-events/a-bounce-an-away-and-a-complaint-are-told-apart", async () => {
    expect(FILES.length).toBeGreaterThan(50);
    for (const name of FILES) {
      const got = await reported(name);
      expect(got.is, name).toBe(name.startsWith("rfc3834") ? "away" : "report");
      if (name.startsWith("arf")) expect(got.reports.map(({ is }) => is), name).toEqual(["complained"]);
      else if (got.is === "report") {
        expect(got.reports.length, name).toBeGreaterThan(0);
        for (const { is } of got.reports) expect(["failed", "late", "delivered"], name).toContain(is);
      }
    }
  });
  it("rules:mail-events/says-what-the-report-says-for-machines", async () => {
    let checked = 0;
    for (const name of FILES.filter((one) => !one.startsWith("arf"))) {
      const want = said(readFileSync(new URL(name, DIR), "utf8"));
      if (want.length === 0) continue;
      const { reports } = await reported(name);
      expect(reports.map(({ is, to }) => ({ is, to })), name).toEqual(want);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(25);
  });
  it("rules:mail-events/says-which-of-ours-it-was", async () => {
    let checked = 0;
    for (const name of FILES.filter((one) => !one.startsWith("rfc3834"))) {
      const raw = readFileSync(new URL(name, DIR), "utf8");
      const inner = raw.slice(Math.max(0, raw.search(/^content-type:\s*(?:message\/rfc822|text\/rfc822-headers)/imu)));
      const of = raw.search(/^content-type:\s*(?:message\/rfc822|text\/rfc822-headers)/imu) < 0 ? undefined : /^Message-I[dD]:\s*(<[^<>\s]+>)/imu.exec(inner)?.[1];
      if (of === undefined) continue;
      for (const report of (await reported(name)).reports) expect(report.of, name).toBe(of);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(20);
  });
  it("rules:mail-events/why-it-did-not-arrive", async () => {
    const why = async (name: string) => (await reported(`${name}.eml`)).reports.map((one) => one.why);
    for (const name of ["lhost-amazonses-05", "lhost-exchange2007-01", "lhost-exim-02", "lhost-office365-01", "lhost-office365-04", "lhost-outlook-02", "lhost-qmail-02", "lhost-sendgrid-01", "lhost-yahoo-01", "rfc3464-01", "rfc3464-10", "rfc3464-26"]) expect(await why(name), name).toEqual(["no such address"]);
    for (const name of ["lhost-amazonses-03", "lhost-exchange2007-02", "lhost-outlook-01", "lhost-yahoo-02"]) expect(await why(name), name).toEqual(["full"]);
    for (const name of ["lhost-office365-03", "lhost-gmail-05", "rfc3464-03", "rfc3464-08"]) expect(await why(name), name).toEqual(["refused"]);
    for (const name of ["rhost-cloudflare-01", "lhost-postfix-06"]) expect(await why(name), name).toEqual(["no answer"]);
  });
});

describe("a conversation", () => {
  const rows = list as unknown as readonly { id: string; from: string; at: number; inReplyTo: string | null; refs: readonly string[] }[];
  const record = (one: (typeof rows)[number]): MailRecord => ({
    id: one.id, is: "person", from: { address: one.from, name: "" }, replyTo: null, to: [{ address: us.addresses[0] ?? "", name: "" }], cc: [], subject: "A subject", at: one.at,
    inReplyTo: one.inReplyTo, refs: [...new Set([...one.refs, ...(one.inReplyTo === null ? [] : [one.inReplyTo])])], text: "Words", whole: "Words",
    proof: { proven: true, by: "dkim", refused: false }, reports: [], attachments: [],
  });
  /** Which belong together, by what each says it answers: worked out here in the plainest way there is. */
  const together = (): readonly (readonly string[])[] => {
    let groups: Set<string>[] = [];
    for (const one of rows) {
      const ids = new Set([one.id, ...record(one).refs]);
      const touching = groups.filter((group) => [...ids].some((id) => group.has(id)));
      groups = [...groups.filter((group) => !touching.includes(group)), new Set([...ids, ...touching.flatMap((group) => [...group])])];
    }
    const there = new Set(rows.map(({ id }) => id));
    return groups.map((group) => [...group].filter((id) => there.has(id)).toSorted()).toSorted((a, b) => ((a[0] ?? "") < (b[0] ?? "") ? -1 : 1));
  };
  it("rules:mail-events/mail-belongs-together-by-what-it-answers-in-any-order", () => {
    const want = together();
    expect(want.length).toBeGreaterThan(10);
    const first = mail.conversations(rows.reduce<Mails>((all, one) => mail.keep(all, record(one)), {}), us);
    for (let seed = 1; seed <= 30; seed += 1) {
      const mixed = shuffled([...rows, ...rows.slice(0, 9)], seed);
      const got = mail.conversations(mixed.reduce<Mails>((all, one) => mail.keep(all, record(one)), {}), us);
      expect(got.map(({ mails }) => mails.toSorted()).toSorted((a, b) => ((a[0] ?? "") < (b[0] ?? "") ? -1 : 1)), `shuffle ${seed}`).toEqual(want);
      expect(got).toEqual(first);
    }
  });
  it("rules:mail-events/a-conversation-is-in-the-order-it-was-written", () => {
    const at2 = new Map(rows.map((one) => [one.id, one.at] as const));
    for (const { mails } of mail.conversations(rows.reduce<Mails>((all, one) => mail.keep(all, record(one)), {}), us)) {
      const times = mails.map((id) => at2.get(id) ?? 0);
      expect(times).toEqual(times.toSorted((a, b) => a - b));
    }
  });
  it("rules:mail-events/each-is-told-once-whatever-the-order", () => {
    for (let seed = 1; seed <= 10; seed += 1) {
      let was: Mails = {};
      const keys: string[] = [];
      for (const one of shuffled([...rows, ...rows], seed)) {
        const now = mail.keep(was, record(one));
        keys.push(...mail.told(was, now, us).map(({ key }) => key));
        was = now;
      }
      expect(keys.length).toBe(rows.length);
      expect(new Set(keys).size).toBe(rows.length);
    }
  });
});
