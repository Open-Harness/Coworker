# chats

Owns the chats of one workspace: which engine conversations are chats, and their title, pin, archive and deletion.

Invariants

- Every function works inside the caller's transaction, so a chat and its conversation appear together or not at all.
- `create` and `fork` are idempotent by request id.
- A deleted chat stays deleted: every function treats it as missing. The engine keeps its entries until the workspace is deleted.

Test: `pnpm vitest --run src/modules/chats`
