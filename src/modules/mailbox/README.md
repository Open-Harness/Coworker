# mailbox

`coworker-mailbox`: the mailboxes of the live tier's two outside people (`person@` and `stranger@` the test domain). It is
deployed as its own Worker (`wrangler.mailbox.jsonc`, entry `src/bin/mailbox.ts`) and is not part of the product.

**Owns**

- Mail in (`email`): a literal Email Routing rule per address brings it here. Any other address is refused. A message's
  ids, sender, subject, text and time of arrival are kept, for 7 days. One Durable Object per address (`openBox`).
- An HTTP API (`fetch`), listed in `types.ts`: list by subject, read one, send, and the Message-ID of what was sent.
- **The Message-ID of a sent message.** Cloudflare makes it and lets nobody set it, and its documents do not say that the id a send
  returns is that header. So a message is also sent blind to its writer, marked with `X-DT-Mailbox-Copy`; the copy that comes back
  says its Message-ID. It is kept apart from the inbox.

**Invariants**

- Every request needs `Authorization: Bearer <MAILBOX_TOKEN>`, compared in constant time. With no token set, all are refused.
- Mail leaves only from the two addresses, and only for the test domain's own addresses (and its subdomains').
- The copy's header counts only when this box is waiting for that id: a header anybody writes hides no mail.

**Outside things**: `Post` (the `send_email` binding) and the Durable Objects, injected by `src/bin/mailbox.ts`.

**Testing**: `mailbox.test.ts`, with a real object's SQLite and a post that records. `outsiders.test.ts` drives its client over it.
