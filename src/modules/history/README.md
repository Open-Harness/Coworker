# history

Owns searching what was said: `searchHistory` for the page, and the `search_history` tool, which asks a helper
conversation so the chat gets an answer instead of raw matches.

Invariants

- Only live chats are searched: no deleted chats, no helper conversations.
- A fork's inherited entries count once, in the chat that wrote them.
- Turns that themselves searched history are skipped.

Test: `pnpm vitest --run src/modules/history`
