import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import type { Env } from "~/main.ts";
import { openSlackChat } from "./service.ts";
import { FAKE_SLACK, mention, slackEvent, type SlackCall } from "./testing.ts";
import type { Mention, SlackChat, SlackChatConfig } from "./types.ts";

const { WORKSPACE } = env as unknown as Env;

/** What the fake Slack Web API has been asked, read over the same network the object used. */
const slackCalls = async (): Promise<SlackCall[]> => (await (await fetch(FAKE_SLACK.callsUrl)).json()) as SlackCall[];
const replies = async (): Promise<SlackCall[]> => (await slackCalls()).filter((call) => call.method === "chat.postMessage");

/** Runs `fn` inside a fresh Workspace object, with its own SQLite. */
const inObject = <T>(fn: (sql: SqlStorage) => Promise<T>): Promise<T> =>
  runInDurableObject(WORKSPACE.get(WORKSPACE.newUniqueId()), (_instance, state) => fn(state.storage.sql));

/** The message's own Slack timestamp, one per event id, so each event is a message of its own. */
const tsOf = (id: string): string => `1700000000.${id.replace(/\D/gu, "").padStart(6, "0")}`;

/** Slack checks a request's age against the real clock, so a signed event is stamped with it. */
const signed = (id: string, text: string, extra: { retry?: number; secret?: string; timestamp?: number } = {}) =>
  slackEvent(mention(id, text, tsOf(id)), { timestamp: Math.floor(Date.now() / 1000), ...extra });

function open(sql: SqlStorage, state: SlackChatConfig["state"], heard: Mention[] = []): SlackChat {
  const answer = (m: Mention): string => (heard.push(m), `Noted: ${m.text}`);
  return openSlackChat({ sql, clock: { now: () => Date.now() }, ...FAKE_SLACK, state, answer });
}

beforeEach(async () => void (await fetch(FAKE_SLACK.callsUrl, { method: "DELETE" })));

describe("chat-sdk", () => {
  it("spike:chat-sdk/slack-in-do", () =>
    inObject(async (sql) => {
      const heard: Mention[] = [];
      const chat = open(sql, "sql", heard);

      // A signed event reaches the adapter in the object, and the reply goes to the Web API with the bot token.
      const first = await chat.receive(await signed("Ev1", "ship the export"));
      expect(first.response.status).toBe(200);
      await first.done;
      expect(heard).toEqual([{ user: "U1", text: expect.stringContaining("ship the export"), thread: `slack:C1:${tsOf("Ev1")}` }]);
      const [reply, ...others] = await replies();
      expect(others).toEqual([]);
      expect(reply?.authorization).toBe(`Bearer ${FAKE_SLACK.botToken}`);
      expect(reply?.body).toMatchObject({ channel: "C1", thread_ts: tsOf("Ev1"), text: expect.stringContaining("Noted:") });

      // A bad signature is refused, and nothing is read, answered or sent.
      for (const request of [
        await signed("Ev2", "forged", { secret: "not-the-secret" }),
        await signed("Ev3", "stale", { timestamp: 1_700_000_000 }),
      ]) {
        const refused = await chat.receive(request);
        expect(refused.response.status).toBe(401);
        await refused.done;
      }
      const unsigned = await chat.receive(
        new Request("https://object.test/in/slack", { method: "POST", body: JSON.stringify(mention("Ev4", "x")) }),
      );
      expect(unsigned.response.status).toBe(401);
      await unsigned.done;
      expect(heard).toHaveLength(1);
      expect(await replies()).toHaveLength(1);

      // Slack retries a slow delivery with the same event id: the answer is not sent twice, now or while the first is still running.
      const retry = await chat.receive(await signed("Ev1", "ship the export", { retry: 1 }));
      expect(retry.response.status).toBe(200);
      await retry.done;
      const [racing, retried] = await Promise.all([
        chat.receive(await signed("Ev5", "race")),
        chat.receive(await signed("Ev5", "race", { retry: 1 })),
      ]);
      await Promise.all([racing.done, retried.done]);
      expect(heard.map((m) => m.text)).toEqual([expect.stringContaining("ship the export"), expect.stringContaining("race")]);
      expect(await replies()).toHaveLength(2);
    }));

  it("answers the same event once even when Slack sends it without a retry header", () =>
    inObject(async (sql) => {
      const chat = open(sql, "sql");
      for (const _ of [1, 2]) await (await chat.receive(await signed("Ev6", "again"))).done;
      expect(await replies()).toHaveLength(1);
    }));

  it("loses the dedupe when the object is evicted and the state was the SDK's memory adapter", () =>
    inObject(async (sql) => {
      // Opening again over the same SQLite is what the next request to an evicted object does.
      await (
        await open(sql, "memory").receive(await signed("Ev7", "once"))
      ).done;
      await (
        await open(sql, "memory").receive(await signed("Ev7", "once", { retry: 1 }))
      ).done;
      expect(await replies()).toHaveLength(2);
    }));

  it("keeps the dedupe across an eviction when the state is the object's SQLite", () =>
    inObject(async (sql) => {
      await (
        await open(sql, "sql").receive(await signed("Ev8", "once"))
      ).done;
      await (
        await open(sql, "sql").receive(await signed("Ev8", "once", { retry: 1 }))
      ).done;
      expect(await replies()).toHaveLength(1);
    }));
});
