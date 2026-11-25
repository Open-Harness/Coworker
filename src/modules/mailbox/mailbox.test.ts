import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { Env } from "~/main.ts";
import { fakeClock, type FakeClock } from "~/modules/clock/testing.ts";
import { emailServicePost } from "./service.ts";
import { fakeMailbox, type FakeMailbox } from "./testing.ts";
import { COPY_HEADER, KEEP_MS } from "./types.ts";

const { WORKSPACE } = env as unknown as Env;

/** The Worker over a fresh object's storage. */
const withMailbox = (fn: (mailbox: FakeMailbox, clock: FakeClock) => Promise<void>, token?: string) =>
  runInDurableObject(WORKSPACE.get(WORKSPACE.newUniqueId()), (_instance, state) => {
    const clock = fakeClock();
    return fn(fakeMailbox(state.storage.sql, clock, token), clock);
  });

const call = async (mailbox: FakeMailbox, method: string, path: string, body?: unknown, token = mailbox.token) => {
  const response = await mailbox.fetch(
    new Request(`https://mailbox.example.test/v1/boxes/${path}`, {
      method,
      headers: { authorization: `Bearer ${token}` },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  );
  return { status: response.status, body: (await response.json()) as unknown };
};

const reply = {
  From: "Launch <launch.live@example.test>",
  Subject: "Re: Export the docs",
  "Message-ID": "<reply-1@example.test>",
  "In-Reply-To": "<sent-1@example.test>",
};

describe("mail in", () => {
  it("is listed by subject, newest first, and read", () =>
    withMailbox(async (mailbox) => {
      expect(await mailbox.arrive("Person@example.test", reply, "On it.")).toBeUndefined();
      await mailbox.arrive(mailbox.person, { ...reply, Subject: "Other" }, "x");
      await mailbox.arrive(mailbox.person, { ...reply, "Message-ID": "<reply-2@example.test>" }, "Done.");
      const { body } = await call(mailbox, "GET", `${mailbox.person}/messages?subject=${encodeURIComponent("Export the docs")}`);
      expect(body).toEqual({
        messages: [
          expect.objectContaining({ uid: 3, messageId: "<reply-2@example.test>" }),
          {
            uid: 1,
            messageId: "<reply-1@example.test>",
            inReplyTo: "<sent-1@example.test>",
            from: "launch.live@example.test",
            subject: "Re: Export the docs",
            at: "2026-11-23T10:00:00.000Z",
          },
        ],
      });
      expect((await call(mailbox, "GET", `${mailbox.person}/messages`)).body).toMatchObject({ messages: { length: 3 } });
      expect(await call(mailbox, "GET", `${mailbox.person}/messages/1`)).toEqual({ status: 200, body: { text: "On it." } });
      expect((await call(mailbox, "GET", `${mailbox.person}/messages/99`)).status).toBe(404);
    }));

  it("is refused for any other address, and dropped after 7 days", () =>
    withMailbox(async (mailbox, clock) => {
      expect(await mailbox.arrive("someone@example.test", reply, "x")).toBe("There is no such address here");
      await mailbox.arrive(mailbox.person, reply, "x");
      clock.advance(KEEP_MS + 1);
      expect((await call(mailbox, "GET", `${mailbox.person}/messages`)).body).toEqual({ messages: [] });
      expect((await call(mailbox, "GET", `${mailbox.person}/messages/1`)).status).toBe(404);
    }));
});

describe("mail out", () => {
  const mail = { to: "launch.live@example.test", subject: "Export the docs", text: "Please." };

  it("goes out as the person, and its Message-ID is the one on the copy that comes back", () =>
    withMailbox(async (mailbox) => {
      const sent = await call(mailbox, "POST", `${mailbox.person}/send`, mail);
      expect(sent).toEqual({ status: 202, body: { id: "sent_1" } });
      expect(mailbox.posted).toEqual([{ ...mail, from: mailbox.person, bcc: mailbox.person, headers: { [COPY_HEADER]: "sent_1" } }]);
      expect((await call(mailbox, "GET", `${mailbox.person}/sent/sent_1`)).status).toBe(404);
      const copy = { From: mailbox.person, Subject: mail.subject, "Message-ID": "<made-by-cloudflare@x>", [COPY_HEADER]: "sent_1" };
      await mailbox.arrive(mailbox.person, copy, mail.text);
      expect((await call(mailbox, "GET", `${mailbox.person}/sent/sent_1`)).body).toEqual({ messageId: "<made-by-cloudflare@x>" });
      // The copy is not in the inbox; mail that only says it is a copy is.
      await mailbox.arrive(mailbox.person, { ...copy, [COPY_HEADER]: "sent_9" }, "x");
      expect((await call(mailbox, "GET", `${mailbox.person}/messages`)).body).toMatchObject({ messages: { length: 1 } });
    }));

  it("reaches the test domain's own addresses only, and a refusal is said", () =>
    withMailbox(async (mailbox) => {
      for (const to of ["a@other.test", "a@notexample.test", "a@example.test.evil.test"])
        expect((await call(mailbox, "POST", `${mailbox.person}/send`, { ...mail, to })).status).toBe(403);
      for (const bad of [{ ...mail, to: "a@example.test, b@example.test" }, { ...mail, subject: " " }, { ...mail, text: 1 }, "x"])
        expect((await call(mailbox, "POST", `${mailbox.person}/send`, bad)).status).toBe(400);
      expect((await call(mailbox, "POST", "launch@example.test/send", mail)).status).toBe(404);
      expect(mailbox.posted).toEqual([]);
      mailbox.post.answer = { _tag: "Refused", reason: "over quota" };
      expect(await call(mailbox, "POST", `${mailbox.stranger}/send`, mail)).toEqual({ status: 502, body: { error: "over quota" } });
    }));

  it("is sent with the binding, and what it throws becomes a value", async () => {
    const outgoing = { ...mail, from: "a@example.test", bcc: "a@example.test", headers: { [COPY_HEADER]: "sent_1" } };
    const given: unknown[] = [];
    const sends = { send: async (message: unknown) => (given.push(message), { messageId: "x" }) } as unknown as SendEmail;
    expect(await emailServicePost(sends)(outgoing)).toEqual({ _tag: "Posted" });
    expect(given).toEqual([outgoing]);
    const throws = { send: async () => Promise.reject(new Error("E_RATE_LIMIT")) } as unknown as SendEmail;
    expect(await emailServicePost(throws)(outgoing)).toEqual({ _tag: "Refused", reason: "E_RATE_LIMIT" });
  });
});

describe("the token", () => {
  it("is needed for everything, and without one set nothing is answered", async () => {
    await withMailbox(async (mailbox) => {
      for (const wrong of ["", "nope", `${mailbox.token}x`])
        expect((await call(mailbox, "GET", `${mailbox.person}/messages`, undefined, wrong)).status).toBe(401);
      expect((await call(mailbox, "POST", `${mailbox.person}/send`, {}, "nope")).status).toBe(401);
      expect((await call(mailbox, "DELETE", `${mailbox.person}/messages`)).status).toBe(405);
    });
    await withMailbox(async (mailbox) => {
      for (const any of ["", "undefined"])
        expect((await call(mailbox, "GET", `${mailbox.person}/messages`, undefined, any)).status).toBe(401);
    }, "");
  });
});
