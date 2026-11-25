import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { Env } from "~/main.ts";
import { fakeClock } from "~/modules/clock/testing.ts";
import { fakeMailbox, type FakeMailbox } from "~/modules/mailbox/testing.ts";
import { COPY_HEADER } from "~/modules/mailbox/types.ts";
import { isFailure, outsiders } from "./service.ts";
import type { Fetch, MailPerson } from "./types.ts";

const { WORKSPACE } = env as unknown as Env;

/** A fetch that answers from a table of `METHOD path` and records every call. */
function scripted(answers: Record<string, () => Response>) {
  const calls: { key: string; headers: Headers; body: unknown }[] = [];
  const fetch: Fetch = async (input, init) => {
    const url = new URL(input);
    const key = `${init?.method ?? "GET"} ${url.pathname}`;
    calls.push({ key, headers: new Headers(init?.headers), body: init?.body === undefined ? undefined : JSON.parse(String(init.body)) });
    return answers[key]?.() ?? new Response("{}", { status: 404 });
  };
  return { fetch, calls };
}

const json =
  (value: unknown, status = 200) =>
  () =>
    Response.json(value, { status });
const clock = () => {
  let at = 0;
  return { now: () => at, sleep: async (ms: number) => void (at += ms) };
};
/** A person whose mailbox is the real mailbox module, over a fresh object's storage. */
const withPerson = (
  fn: (person: MailPerson, mailbox: FakeMailbox, time: ReturnType<typeof clock>) => Promise<void>,
  token = "mailbox-token-xyz",
) =>
  runInDurableObject(WORKSPACE.get(WORKSPACE.newUniqueId()), (_instance, state) => {
    const mailbox = fakeMailbox(state.storage.sql, fakeClock());
    const time = clock();
    const settings = { url: "https://mailbox.example.test/", token, address: mailbox.person };
    return fn(
      outsiders.mailboxPerson(settings, (url, init) => mailbox.fetch(new Request(url, init)), time),
      mailbox,
      time,
    );
  });

describe("the person on email", () => {
  it("sends as the mailbox and gives the Message-ID other people see", () =>
    withPerson(async (person, mailbox, time) => {
      const tick = time.sleep;
      time.sleep = async (ms) => {
        await tick(ms);
        const [mail] = mailbox.posted;
        if (mail === undefined || time.now() !== 3_000) return;
        // The copy comes back, as Cloudflare sent it.
        await mailbox.arrive(
          mailbox.person,
          { From: mail.from, Subject: mail.subject, "Message-ID": "<s1@cf>", ...mail.headers },
          mail.text,
        );
      };
      const sent = await person.send({ to: "launch.live@example.test", subject: "Export the docs", text: "Please." });
      expect(sent).toEqual({ subject: "Export the docs", messageId: "<s1@cf>" });
      expect(mailbox.posted).toEqual([
        {
          from: "person@example.test",
          bcc: "person@example.test",
          to: "launch.live@example.test",
          subject: "Export the docs",
          text: "Please.",
          headers: { [COPY_HEADER]: "sent_1" },
        },
      ]);
      expect(await person.inbox("Export the docs")).toEqual([]);
    }));

  it("finds a reply by subject in the inbox, with what it answers, and reads it", () =>
    withPerson(async (person, mailbox) => {
      const headers = {
        From: "Launch <launch.live@example.test>",
        Subject: "Re: Export the docs & more",
        "Message-ID": "<reply-1@example.test>",
        "In-Reply-To": "<sent-1@example.test>",
      };
      await mailbox.arrive(mailbox.person, headers, "On it.");
      expect(await person.inbox("Export the docs & more")).toEqual([
        {
          uid: 1,
          messageId: "<reply-1@example.test>",
          inReplyTo: "<sent-1@example.test>",
          from: "launch.live@example.test",
          subject: "Re: Export the docs & more",
          at: "2026-11-23T10:00:00.000Z",
        },
      ]);
      expect(await person.read(1)).toBe("On it.");
    }));

  it("says why, without the token, when the token is wrong, mail is refused or a message is not there", async () => {
    await withPerson(async (person) => {
      const denied = await person.inbox("x");
      expect(denied).toEqual({ _tag: "Failed", reason: "The mailbox answered 401 to GET /messages?subject=x" });
    }, "wrong-token");
    await withPerson(async (person) => {
      expect(await person.read(9)).toMatchObject({ _tag: "Failed" });
      const away = await person.send({ to: "a@other.test", subject: "S", text: "t" });
      expect(away).toEqual({ _tag: "Failed", reason: "The mailbox answered 403 to POST /send" });
    });
  });

  it("gives up on a copy that never comes back", () =>
    withPerson(async (person) => {
      const sent = await person.send({ to: "a@example.test", subject: "S", text: "t" });
      expect(isFailure(sent) && sent.reason).toContain("did not come back");
    }));
});

describe("the person on GitHub", () => {
  it("opens an issue, reads its comments and closes it", async () => {
    const { fetch, calls } = scripted({
      "POST /repos/org/sandbox/issues": json({ number: 4, html_url: "https://github.com/org/sandbox/issues/4" }),
      "GET /repos/org/sandbox/issues/4/comments": json([
        { id: 9, body: "On it", user: { login: "coworker-staging[bot]", type: "Bot" } },
        { id: 10, body: "thanks", user: { login: "ama-test", type: "User" } },
        { nonsense: true },
      ]),
      "PATCH /repos/org/sandbox/issues/4": json({}),
    });
    const person = outsiders.githubPerson({ token: "gh-token" }, fetch);
    const issue = await person.openIssue("org/sandbox", "Export docs", "@coworker-staging please");
    if (isFailure(issue)) throw new Error(issue.reason);
    expect(issue).toEqual({ repo: "org/sandbox", number: 4, url: "https://github.com/org/sandbox/issues/4" });
    expect(await person.comments(issue)).toEqual([
      { id: 9, body: "On it", authorType: "Bot", author: "coworker-staging[bot]" },
      { id: 10, body: "thanks", authorType: "User", author: "ama-test" },
    ]);
    await person.close(issue);
    expect(calls.at(-1)?.body).toEqual({ state: "closed" });
    expect(calls[0]?.headers.get("authorization")).toBe("Bearer gh-token");
  });

  it("reports a refusal as a value, never the token", async () => {
    const { fetch } = scripted({ "POST /repos/org/sandbox/issues": json({ message: "Not Found" }, 404) });
    const issue = await outsiders.githubPerson({ token: "gh-token" }, fetch).openIssue("org/sandbox", "t", "b");
    expect(issue).toEqual({ _tag: "Failed", reason: "GitHub answered 404 to POST /repos/org/sandbox/issues" });
  });
});

describe("eventually", () => {
  it("returns the first value, tries again after a throw, and gives up when time is up", async () => {
    let tries = 0;
    const found = await outsiders.eventually(
      async () => {
        tries += 1;
        if (tries === 1) throw new Error("not yet");
        return tries === 3 ? "here" : undefined;
      },
      { withinMs: 10_000, everyMs: 1_000, ...clock() },
    );
    expect(found).toBe("here");
    expect(await outsiders.eventually(async () => undefined, { withinMs: 5_000, everyMs: 1_000, ...clock() })).toBeUndefined();
  });
});

describe("the sign-in link", () => {
  const arrives = (mailbox: FakeMailbox, text: string) =>
    mailbox.arrive(mailbox.person, { From: "hello@example.test", Subject: "Your sign-in link", "Message-ID": "<s@x>" }, text);

  it("is the one in mail that arrives after the ask, not an older one", () =>
    withPerson(async (person, mailbox, time) => {
      await arrives(mailbox, "Sign in: https://staging.example.test/old");
      const ask = async () => {
        await arrives(
          mailbox,
          "Sign in to Co-worker: https://staging.example.test/api/auth/magic-link/verify?token=new\r\n\r\nThe link works once.",
        );
        return new Response("{}");
      };
      const link = await outsiders.linkAfter(person, "Your sign-in link", ask, { withinMs: 10_000, everyMs: 1_000, ...time });
      expect(link).toBe("https://staging.example.test/api/auth/magic-link/verify?token=new");
    }));

  it("is none when the app refuses to send one or no mail comes", () =>
    withPerson(async (person, mailbox, time) => {
      await arrives(mailbox, "Sign in: https://staging.example.test/old");
      const polling = { withinMs: 3_000, everyMs: 1_000, ...time };
      expect(await outsiders.linkAfter(person, "s", async () => new Response("{}", { status: 400 }), polling)).toBeUndefined();
      expect(await outsiders.linkAfter(person, "Your sign-in link", async () => new Response("{}"), polling)).toBeUndefined();
    }));
});

describe("who the machine user is", () => {
  it("is the user id and login the token belongs to", async () => {
    const { fetch } = scripted({ "GET /user": json({ id: 5001, login: "ama-test" }) });
    expect(await outsiders.githubPerson({ token: "t" }, fetch).whoami()).toEqual({ id: 5001, login: "ama-test" });
  });
});
