# liveapp

The live runner's own client of the app. The test workspace's Owner is the allowed person's mailbox, so the
runner signs in for real and sets staging up over the same API a browser uses; there is no test-only route on staging.

**Owns**

- `signIn`: asks the app for the emailed sign-in link (`/api/auth/sign-in/magic-link`), takes the link from whoever reads
  that mailbox (`obtainLink`, injected), follows it and keeps the session cookie. Requests carry the app's own origin.
- `provision`: finds or creates, in this order, the workspace (`live`), its model endpoint (`coworker-fake-model`; checks that
  managers can think with it), the manager (`launch`), who may ask it (emails and GitHub user ids, set every time), an
  environment that the agent `Worker` runs in, and the repo the manager hears. A repo before the App is installed is a
  failure that says to install it in the app (a browser must do that: GitHub sends the Owner back with proof).
- Reads the live tests assert on: the board, Events, chat, a run's report and transcript.

**Invariants**

- Idempotent: a second run finds what the first made and makes nothing twice.
- It reads no environment and no clock; the address, `fetch` and the way to read the mailbox are given.

**Testing**: `src/flows/liveapp.test.ts` drives it against the whole Worker in the fast tier (the sign-in link from the fake
outbox), including the email assertions the live tests make: a task on the board for an allowed person's mail, exactly one
line in Events and no task for a stranger's.
