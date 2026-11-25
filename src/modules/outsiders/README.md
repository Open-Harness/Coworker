# outsiders

The outside people of the live tier, as clients behind interfaces (book section 2): a person on email and a person on
GitHub. A live test says what the person does; this module says how the provider lets it be done.

**Owns**

- `mailboxPerson`: a mailbox of the `coworker-mailbox` Worker, through its HTTP API (the mailbox module).
  - `send` posts the message and waits for its Message-ID, which the Worker reads off the copy that comes back.
  - `inbox(subject)` lists the mail whose subject contains it; each message carries `messageId` and `inReplyTo`, which is how
    a test sees that a reply is threaded.
  - `read(uid)` gives an inbox message's text, and `linkAfter` uses it: ask the app for a sign-in link, then return the link in
    the newest "Your sign-in link" mail that arrives after the ask. The live runner signs in this way, as the Owner.
- `githubPerson`: the machine user, through GitHub's REST API: say who the token is (`whoami`), open an issue, read its comments (a `Bot` author is
  the App), close it.
- `eventually`: polls until a value shows or time is up; the clock and sleep are injected.

**Invariants**

- Nothing here reads the environment or the clock on its own: the token, the address, `fetch`, `sleep` and `now` are
  given. A failure is a value (`{ _tag: "Failed", reason }`), never a throw, and a reason never contains the token.

**Testing**: `outsiders.test.ts` drives the mail client over the mailbox module itself and the GitHub one over a scripted `fetch`; no network.
