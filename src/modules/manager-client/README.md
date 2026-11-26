# manager-client

Owns the page's copy of one workspace: settings, usage, documents, schedules, people, and the transcripts of chats opened here.

Invariants

- One chat is followed at a time. After a reconnect it is followed from the newest entry held, so nothing is missed or sent twice.
- Entries once loaded stay, so going back to a chat shows it at once.
- A prompt survives a reconnect and is placed once. Reads fail while offline.

Test: `pnpm vitest --run src/modules/manager-client` (against the real server, with the scripted model)
