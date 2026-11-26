# chat-sdk

A spike, not a feature: does Vercel's Chat SDK (`chat` and `@chat-adapter/slack`, pinned at 4.44.0) run inside a Durable
Object? The answer and what did not work are in `docs/spikes/chat-sdk-slack-in-do.md`. Nothing in `src/main.ts` uses this module.

**Owns**

- `openSlackChat(config)`: the SDK with one Slack adapter over one object's SQLite. `receive(request)` answers a
  signed Events API request and returns `done`, which settles when the SDK's background work has.
- `internal/sql-state.ts`: the SDK's `StateAdapter` over `SqlStorage`, so subscriptions, locks and dedupe marks survive
  an eviction.
- `testing.ts`: the fake Slack Web API (`slackApi`, answered by Miniflare's `outboundService`) and `slackEvent`, which
  signs a payload the way Slack does. No real token or network.

**Invariants**

- The signing secret, bot token and Web API base come in as config; nothing here reads the environment.
- A request that fails verification is answered 401 and nothing is parsed, handled or sent.
- The same Slack `event_id` is answered once, also after the object restarts, as long as the state is `sql`.

**Testing**: `chat-sdk.test.ts` runs the SDK inside a real Workspace object (`runInDurableObject`) and reads what the
fake Web API received. `spike:chat-sdk/slack-in-do` is the claim; the other tests record what the state choice changes.
