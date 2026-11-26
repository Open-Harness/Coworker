import { describe, expect, it } from "vitest";
import { fakeMailer } from "~/modules/mail/testing.ts";
import { email } from "./service.ts";
import { eml, memoryFiles } from "./testing.ts";
import type { Mailbox } from "./types.ts";
import type { Trigger } from "~/modules/triggers/types.ts";

const manager = {
  managerId: "m1",
  name: "Launch",
  slug: "launch",
  address: "launch.acme@co-worker.tech",
  template: "kanban",
  objectId: "o",
  region: "eu",
  createdAt: 0,
} as const;

function source(received: Trigger[]) {
  const mailbox: Mailbox = {
    managers: async () => [manager, { ...manager, managerId: "m2", slug: "on.call" }],
    receive: async (trigger) => (received.push(trigger), { _tag: "Candidate", strength: "explicit" }),
    logEvent: async () => undefined,
  };
  return email.source({
    mailDomain: "co-worker.tech",
    sendFrom: "Hello@co-worker.tech",
    maxBytes: 1_000_000,
    authServId: "mx.cloudflare.net",
    mailbox: async (name) => (name === "acme" ? mailbox : undefined),
    files: memoryFiles(),
    now: () => 7,
  });
}

describe("the email source", () => {
  it("reads the task from a reply address and the thread from References", async () => {
    const received: Trigger[] = [];
    const raw = eml({
      from: "Ama <AMA@acme.test>",
      to: "x",
      subject: "Re: Docs",
      text: "Yes",
      messageId: "<2@acme.test>",
      headers: { References: "<1@acme.test>", "In-Reply-To": "<1@acme.test>" },
    });
    await source(received).receive({ from: "ama@acme.test", to: "launch.acme+dt-14@co-worker.tech", raw, rawSize: raw.length });
    expect(received[0]).toMatchObject({
      id: "email:<2@acme.test>",
      task: "DT-14",
      actor: { id: "ama@acme.test", verified: true, display: "Ama" },
    });
    expect(received[0]?.threads.map(({ key }) => key)).toEqual(["<1@acme.test>", "<2@acme.test>"]);
  });

  it("reads the last dot as the end of the slug, whatever the case, and nothing on another domain", async () => {
    const received: Trigger[] = [];
    const raw = eml({ from: "ama@acme.test", to: "x", subject: "Docs", text: "Hi", messageId: "<3@acme.test>" });
    const at = async (to: string) => (await source(received).receive({ from: "ama@acme.test", to, raw, rawSize: raw.length }))._tag;
    expect(await at("Launch.ACME@Co-Worker.tech")).toBe("Routed");
    expect(await at("on.call.acme@co-worker.tech")).toBe("Routed");
    for (const to of [
      "launch@co-worker.tech",
      "launch@acme.co-worker.tech",
      "launch.acme@co-worker.tech.evil.test",
      "launch.acme@sub.co-worker.tech",
      "launch.acme@evil.test@co-worker.tech",
      "launch.other@co-worker.tech",
      "acme.launch@co-worker.tech",
      ".acme@co-worker.tech",
    ])
      expect(await at(to), to).toBe("Rejected");
  });

  it("drops what managers and the app itself send, and takes in anybody else on the domain", async () => {
    const from = async (sender: string) => {
      const raw = eml({ from: sender, to: "x", subject: "Docs", text: "Hi", messageId: "<4@x.test>" });
      return (await source([]).receive({ from: sender, to: manager.address, raw, rawSize: raw.length }))._tag;
    };
    for (const ours of ["launch.acme@co-worker.tech", "Bo.other+dt-3@Co-Worker.tech", "hello@co-worker.tech"])
      expect(await from(ours), ours).toBe("Dropped");
    for (const person of ["person@co-worker.tech", "hello@acme.test", "launch.acme@elsewhere.test"])
      expect(await from(person), person).toBe("Routed");
  });

  it("answers in the thread with the task's own reply address", async () => {
    const mailer = fakeMailer();
    const to = { kind: "email", to: "ama@acme.test", subject: "Docs", messageId: "<2@acme.test>", references: ["<1@acme.test>"] } as const;
    await email.channel(mailer).send({ key: "k", from: { address: manager.address, name: "Launch" }, to, task: "DT-3", text: "Done." });
    expect(mailer.sent[0]).toMatchObject({
      subject: "Re: Docs",
      replyTo: "launch.acme+dt-3@co-worker.tech",
      headers: { "In-Reply-To": "<2@acme.test>", References: "<1@acme.test> <2@acme.test>" },
    });
  });
});
