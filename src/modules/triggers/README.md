# triggers

What every Source produces and how it is let in: the Trigger, the manager's Policy, and the Gate.

**Owns**

- The `Trigger` shape: one immutable event, its id from the platform's own id (the idempotency key), its threads, its
  actor in the platform's own identity, and where an answer goes (`ReplyAddress`).
- The Gate, as plain code (model.md "Who may start work"): allowed and addressed → explicit; allowed but not
  addressed → inferred; not on the list → the admission table for that scope, ignored by default; bots → inferred only
  when on the bot list. Accept mode `off` drops inferred work.
- `policyOf`: narrows a stored or sent Policy.

**Invariants**

- An actor the platform does not vouch for (`verified: false`, such as a From that fails DKIM) is never on the list.
- Email addresses and domains compare lowercased; other handles compare by kind, space and id.
- Follow-ups never reach the Gate: the Workspace object routes them first.

**Testing**: `triggers.test.ts` runs the Gate's table row by row.
