# email

Email as a Source: inbound mail becomes a Trigger, and replies go back threaded.

**Owns**

- Addresses: `launch.acme@<mailDomain>` names a manager and a workspace (the last dot separates them); `launch.acme+dt-14@…` also
  names a Task, so a reply to it is a follow-up with no Gate. Every workspace's mail is on one domain, so one catch-all carries it.
- Inbound (`email.source(…).receive`): over the size limit or to an unknown address is rejected with a reason
  (Email Routing bounces it). Our own mail coming back (from an address of a manager's form, or from the app's own), out-of-office replies and bounces are dropped with a line in
  Events. Anything else becomes a Trigger whose id is its `Message-ID`, whose threads are every message id it names,
  and whose sender is verified only when the trusted receiver's `Authentication-Results` say DKIM passed for the
  From domain. Attachments go to the file store first.
- Outbound (`email.channel`): a reply from the manager's address, subject `Re: …`, `In-Reply-To` and `References`
  set, `Reply-To` the Task's address.

**Invariants**

- A person on the mail domain is a person: only a manager's address and the app's own are ours.
- A From that fails DKIM is an unknown sender, whatever list it is on.
- The same `Message-ID` twice is one Trigger (the Workspace stores Triggers by id).

**Testing**: `email.test.ts` parses messages built by `testing.ts`'s `eml`. The flows in `src/flows/email.test.ts`
feed them to the Worker's `email()` handler.
