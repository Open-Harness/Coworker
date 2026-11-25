# Spike: Chat SDK's Slack adapter inside a Durable Object

Eval: `spike:chat-sdk/slack-in-do` (build-plan section 4, "Alongside · Chat SDK spike"). It settles model.md's open
question 1: do the adapters run in a Durable Object, so that chat platforms may be promised?

Code: `src/modules/chat-sdk/` (not wired into `src/main.ts`). Test: `src/modules/chat-sdk/chat-sdk.test.ts`.

Accepted by Aaron, 2026-11-24. It covers what the verdict says; "What this does not show" still stands.

## Verdict

**The claim holds, for Slack, on the fast tier.** `spike:chat-sdk/slack-in-do` passes: inside a real Workspace object
(workerd, via `runInDurableObject`), a Slack event signed with a test signing secret reaches the adapter, a bad signature
is refused with 401, a retry of the same event replies once, and the reply goes to a fake Slack Web API with the bot
token. No network and no real credential: the fake is Miniflare's `outboundService`, and any other host is still 502.

What this does **not** show: Discord's Gateway socket, any other adapter, the real Slack, a deployed Worker (the test is
in workerd under Miniflare), or load. See "Not verified".

## Packages

| Package | Version | Published | Role |
|---|---|---|---|
| `chat` | 4.44.0 | 2026-11-02 | the SDK: `Chat`, handlers, `thread.post` |
| `@chat-adapter/slack` | 4.44.0 | 2026-11-02 | the adapter: verifies, parses, calls Slack's Web API |
| `@chat-adapter/state-memory` | 4.44.0 | 2026-11-02 | in-memory state, used only to show what it loses |

All three are exact-pinned in `devDependencies`. 4.45.0 (2026-11-13) is the latest and was too new to pin. The adapter
depends on `@slack/web-api` (7.19.0 resolved) and `@slack/socket-mode`, and `chat` on the unified/remark stack: 88
packages in all.

## What worked

- **It loads and runs in workerd** under `nodejs_compat` (already on in `wrangler.jsonc`). No patches, no shims.
- **Signature verification** is the adapter's own: HMAC-SHA256 over `v0:<timestamp>:<body>`. A wrong secret, a missing
  signature and a timestamp outside the adapter's five-minute window (300 s) each give 401, before anything is parsed, handled or sent.
- **Receiving and replying** work through the public API only: `chat.webhooks.slack(request, { waitUntil })`, a handler
  registered with `chat.onNewMention`, and `thread.post(text)`. The reply is `chat.postMessage` with `channel`,
  `thread_ts` and the bot token as `Authorization: Bearer`.
- **The Web API base is configurable** (`apiUrl`), and Slack's HTTP client goes through the runtime's outbound fetch, so a
  fake needs no change to the SDK.
- **Retries**: the same `event_id` is answered once, with or without Slack's `x-slack-retry-num` header, and also when
  the retry arrives while the first delivery is still being handled.
- **The acknowledgement is separate from the work.** `webhooks.slack` returns 200 at once and gives the handler to
  `waitUntil`. A Source must do the same: Slack gives 3 seconds.

## What did not work, or needs us to build something

1. **State must be durable, and the SDK's only dependency-free adapter is not.** The SDK keeps subscriptions, thread
   locks, the dedupe marks of the retry check and cached values in a `StateAdapter`. `@chat-adapter/state-memory` is
   per instance: after the object is evicted (or its isolate restarts) a Slack retry is answered **again**. The test
   `loses the dedupe when the object is evicted…` shows it (2 replies); the SQLite state shows 1. The other official
   adapters are `state-redis`, `state-ioredis` and `state-pg`, which need a network database; we have none and don't want
   one. A community `chat-state-cloudflare-do` exists on npm and was **not** evaluated. So we write the adapter:
   `internal/sql-state.ts` is 77 lines over `SqlStorage`, 18 methods (subscriptions, locks with tokens and TTL, a keyed
   cache with TTL and set-if-absent, lists, a message queue). It passes the test but has had no review against the
   SDK's own adapter contract tests.
2. **Background work has no owner in a Durable Object.** The SDK expects `waitUntil` from an `ExecutionContext`. A
   Durable Object's `fetch` has none, so the module collects the tasks and returns them as `done`; the object must
   keep the request open or hand `done` to `ctx.waitUntil` itself. If the handler (for us: the Gate, the Workspace
   call, the manager's turn) outlives the request, Slack's retry arrives anyway. The dedupe above is what makes that
   safe. How a long manager turn should be driven (a Task, not a handler) is a design question the SDK does not answer.
3. **Dedupe is partly fire-and-forget.** The adapter writes its delivered-event mark without awaiting it
   (`markEventDelivered` in `@chat-adapter/slack/dist/index.js`), and a failed write only means a retry is
   processed again. The SDK then relies on its message-level dedupe (`dedupeTtlMs`), which does use the state's
   atomic set-if-absent. Our Trigger id (from the platform's own id) is a third guard.
4. **The timestamp check uses the real clock.** Our injected `Clock` does not reach the adapter's five-minute
   tolerance, so a test must stamp events with the real time and cannot drive the window with a fake clock.
5. **Verification and parsing are not separable from the delivery.** The adapter verifies and handles in one call. If we
   want to run the Gate before the SDK reads a message, we call `@chat-adapter/slack/webhook`
   (`verifySlackRequest`, `parseSlackWebhookBody`, both exported) ourselves and use the SDK only for sending. That
   subpath is 2 KiB bundled; the SDK is not.
6. **Noise at load.** The adapter's package pulls in `@slack/socket-mode`, which pulls in `ws`, whose optional
   `bufferutil` require fails in the vitest worker pool with a `[vitest-plugin] Failed to require` log line. It is
   harmless here (webhook mode), but it means the Socket Mode client is shipped and never used.
7. **Our identity model is not the SDK's.** The handler receives `message.author.userId`, text with Slack's mention
   markup rewritten using the Web API's `users.info`, and a thread id `slack:<channel>:<thread_ts>`. The test saw the
   adapter call `users.info` for the sender and the bot before the handler ran, so a reply path depends on that call
   too. Where the Slack team id (the Handle's `space`) comes from on the SDK's `Message` was **not checked**; the
   wrapper may have to read it from the raw event.
8. **One SDK, many things we do not use.** Cards, modals, streaming, OAuth installs, assistant threads. Only
   `webhooks`, one mention handler and `post` were exercised.

## Bundle size added

Measured with esbuild (minified, ESM, `--platform=node` so Node built-ins stay external, `workerd`/`worker` export
conditions), one entry that builds a `Chat` with the Slack adapter and the memory state and serves `webhooks.slack`:

| Entry | Raw | gzip -9 |
|---|---|---|
| empty Worker | 71 B | 99 B |
| `@chat-adapter/slack/webhook` only (verify and parse) | 2.0 KB | 1.0 KB |
| `chat` + `@chat-adapter/slack` + `state-memory` | 709 KB | 193 KB |

So the full path adds roughly **0.7 MB raw, 0.19 MB gzipped** to the Worker, one adapter. Every further adapter adds its
own SDK (Discord, Teams, etc.). It is far under the 3 MB (Free) and 10 MB (Paid) gzip limits, but it is a cold-start cost
on a Worker that also holds the app. The bundle needs these Node modules at runtime: `async_hooks`, `crypto`, `dns/promises`,
`https`, `net`, `stream`, `zlib`. `dns/promises` and `https` belong to the file downloader's DNS-pinned transport
(attachments); the adapter lets us replace it with `fileTransport`. Whether workerd serves a DNS lookup was not tested.
These numbers come from an esbuild approximation, **not** Wrangler's own bundle.

## State adapter needs, in one place

| Need | Why | Verdict |
|---|---|---|
| Durable keyed values with TTL and set-if-absent | event and message dedupe | SQLite, done |
| Thread subscriptions | follow-up messages in a thread without a new mention | SQLite, done, not exercised past the interface |
| Locks with tokens and TTL | one handler per thread at a time | SQLite, done, not exercised by a test |
| Lists and a message queue | history cache; concurrency strategies | SQLite, done, not exercised by a test |
| Lives with the tenant | one workspace's Slack state must not mix with another's | the object's own SQLite is per workspace |

Chat state that must outlive the object belongs next to the Triggers in the Workspace's SQLite, not in a second store.

## Recommendation

**Promise Slack. Do not yet promise "chat platforms" as a class.**

- Slack: yes, with these conditions. We write and own the state adapter (about 80 lines); the Source verifies and
  maps first and calls the SDK to send; the handler returns at once and the work becomes a Trigger (the model already
  stores Triggers by id, so the same event twice is one Trigger).
- The generic `SourceKind` over "Chat SDK adapters" is a hypothesis with one adapter (AGENTS.md: one adapter is a
  hypothetical seam). Discord needs a Gateway socket held by an object, which this spike did not touch. Teams, Telegram,
  WhatsApp, Google Chat have different verification and none was run. Promise each only after its own spike or eval.
- The alternative, writing Slack ourselves, is small for what we use (verify, parse an event, `chat.postMessage`) and
  avoids 0.7 MB and 88 packages. If bundle size, the `ws` noise or the SDK's churn (11 releases between 2026-08-07
  and 2026-11-13) hurt, `@chat-adapter/slack/webhook` plus our own `postMessage` is the fallback, and the Source's
  interface is the same.
- Book edits that follow, for the author to make (none made here): model.md open question 1 can be answered for
  Slack; the sentence "chat platforms wrap Vercel's Chat SDK adapters" should name Slack only until others are
  shown.

## Not verified

- A deployed Worker or a real Slack workspace; `wrangler deploy`'s own bundle.
- That `ctx.waitUntil` in a deployed Durable Object keeps the background work alive; eviction mid-handler.
- Slack-side behaviours: the exact retry schedule, URL verification (`url_verification`), slash commands, interactivity.
  The adapter has code for them; none was run.
- Locks, subscriptions, lists and queues of the SQL state under real use (only the keyed values and the dedupe were).
- Multi-workspace installs (OAuth, `setInstallation`), and the encrypted token storage.
- Discord, Teams, Telegram, WhatsApp, Google Chat, and the community `chat-state-cloudflare-do`.
- Memory and CPU time per request; the cold start of a 0.7 MB module.

## How to run

```bash
pnpm vitest --run --project server src/modules/chat-sdk
```
