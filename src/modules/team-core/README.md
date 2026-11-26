# team-core

What every screen of the hosted app stands on.

**Owns**

- `createServer(send)`: the line to the HTTP API. JSON in, a narrowed value or the server's own words for the failure
  out; it never throws. `upload` puts a file's own bytes, such as a logo.
- `teamLinks`: where the hosted app's screens are. No other module spells an address.
- `useNarrow`: a phone, or a window as narrow as one.
- `useLoading` and `Load`: loading when a screen opens, asking again while it is open, and the spinner or the failure
  until there is something to show. A failure that `useLoading` hands out carries its own `retry`, so `Load` always
  offers "Try again" (or the `onRetry` it is given, when one screen loads several things).
- The narrowing helpers (`isRecord`, `each`, `textOf`…) decoders are made of.

**Invariants**

- Answers are `unknown` until a decoder narrows them.
- Knows no screen and no wire shape: those belong to `team-app`, `team-join`, `team-start`, `team-shell` and `team-settings`.

**Testing**: `team-core.test.tsx`, with a `send` that answers from memory.
