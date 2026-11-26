# mailing

The workspace's mailbox: every mail that came in to its address, and every mail it sent, kept as [mail-events](../mail-events/README.md) read them. One mailbox
for the whole co-worker (`<workspace>@<mail domain>`), heard by every manager whose playbook has an event trigger on it.

`handle(call)` is the one door (`MailCall`, `MailAnswer`): a mail arrived (`hear`), the pages of the mailbox (`view`, `conversation`), a person writes as the co-worker
(`write`, `hand back`, `tell`), and what a manager does (`reply`, `send`, `draft`, `search`). `run()` tells the work what became true and makes what quiet is owed.

Given: a `MailStore` (what it keeps), a `Mailer`, a clock, the managers that hear the mailbox (`MailListener`), and `keep` (an item, once, for intake).

## Invariants

- A mail is kept once by its Message-ID. The same mail twice changes nothing and makes no second item.
- What a person wrote is an item for intake (`email`, place the mailbox, thread `email:<mailbox>#<conversation>`): a conversation work follows is its thread, so the
  answer joins that work. A mail that is not proven to be from who it says is kept as `Left`, with why, and is never judged or asked about, even in a conversation
  that work follows.
- What became true (it came back, they complained, they are away) is told to the work that follows the conversation, once; a bounce and a complaint are `failed`
  for the check `delivered`. An address that does not exist, and one that complained, is not written to again (`mail-events.answer` says No).
- What leaves leaves once for each key, and is kept as a mail of ours, so that what comes back about it finds its conversation.
- A conversation a person has written in is theirs until they hand it back: a manager's reply is refused, and no quiet wait is made for it.
- A wait is made once for a conversation whose last word is ours, that open work follows, that nobody is away from, after the time its trigger says.

## How to test

`mailing.test.ts`, with a memory store, a fake mailer and listeners that remember what they were told. The whole of it is shown by `evals/flows/mail.eval.ts`.
