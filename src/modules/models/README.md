# models

A workspace's model access: provider keys (Anthropic, OpenAI), its own OpenAI-compatible endpoints, and ChatGPT
sign-in. Kept in the Workspace object (`model_connection`); every key or token is in the vault as `model:<id>`.

**Invariants**

- Adding a connection runs a test call (list the models, then a few tokens from the smallest that chats, trying the next if one cannot; OpenAI-style servers refuse fewer than 16) and keeps the result:
  "works, checked at" or the provider's own error message. The Keys screen shows exactly that.
- A key is read from the vault only for the test call. Nothing returned by this module carries it.
- `readiness()` is what a manager checks before it starts: `Ready` with a working connection, or `NoModel` with the
  reason to show the person. Nothing throws.
- Endpoints must be `https://`.
- ChatGPT sign-in is pi-ai's flow (PKCE, OpenAI's dynamic client) with the redirect pasted back: OpenAI only
  redirects to `http://127.0.0.1:1455/auth/callback`, which a hosted app cannot listen on. The PKCE verifier waits
  in the vault for one use. Tokens are kept in the vault as JSON, and the Workspace object's alarm refreshes them
  5 minutes before they expire; a refused refresh marks the connection Failed with "Sign in with ChatGPT again".

**Managers use a connection** without holding its key:

- `route()` names the first working connection and its wire format (Anthropic's messages, or OpenAI chat completions for
  OpenAI, ChatGPT and endpoints, as the test call does). No key, no provider address.
- `forward(call)` is the one place a manager's model call is made. It takes a path under the connection, a JSON body and
  a few plain headers; chooses the model (`internal/route.ts`: an endpoint's first, Anthropic's Sonnet, else the first
  that is not small or special-purpose); adds the credential itself; and returns the provider's answer.
- The key is read by `vault.use`, and that call lasts until the answer's last byte has been handed on, so a streamed
  answer is forwarded from inside it. If the reader stops, the call ends and the key is released with it.
- What goes onward is only `accept` and the `anthropic-*` headers. What comes back is only the status, `content-type`
  and `retry-after`. A failure body has the key (and a ChatGPT sign-in's tokens) replaced by `[key]`. A redirect is
  refused, not followed. Each call writes a `secret.use` line (the name only) in the Workspace object's audit log.

**Testing:** `models.test.ts` runs on a real Workspace object's storage. `testing.ts` answers Anthropic, OpenAI and
one endpoint (`https://models.example.test/v1`) as Miniflare's `outboundService`; only `FAKE_KEYS` work. A streamed chat
request goes to the scripted models (`internal/scripted.ts`), which check the credential and record what each call
carried in `modelCallsSeen`. `forwarding.test.ts` holds the stream open by hand to show the key is held only while it runs.

**Changing a connection.** `change(id, {key?, label?, baseUrl?})` replaces a key, or edits an own endpoint, and tests it
again; `remove` takes the connection and its key from the vault. The settings module wraps both with an audit line.

**Choices.** `route(wanted?)` follows, in order, the caller's choice (an agent's connection and model), the workspace's default model (`defaultPick`, from Settings), then the first working connection. A choice that cannot be used (its connection failed or was removed, or it no longer lists the model) is skipped and the route's `notice` says which and what answered instead. `forward` keeps the model a call names only when the connection lists it.
