# protocol

Owns every message on the two WebSockets: types, limits, validation, and splitting of long messages.

Invariants

- Commands are checked strictly (unknown fields are refused); events are open, so a server one version ahead still works.
- Every command except typing has a `requestId` that survives a reconnect. Replaying one never repeats its effect.
- No server frame exceeds celld's 1 MiB message limit.

Change `PROTOCOL_VERSION` when an old page can no longer talk to a new server; pages then ask to be reloaded.

Test: `pnpm vitest --run src/modules/protocol`
