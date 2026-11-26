# mail-events

What a mail is, whose it really is, which conversation it belongs to, and what became of the ones we sent.

Not built. `types.ts` is the contract and compiles; `service.ts` says so where it is called. What it must do: spec X2, X8, X15, X16 in
[docs/spec.md](../../../docs/spec.md). What shows it: the evals under `mail-events` and `mail-state` in [docs/book.md](../../../docs/book.md).
Why it is so, with what was measured: [docs/spikes/real-events.md](../../../docs/spikes/real-events.md).

## How it is used

Pure, but for reading MIME (`postal-mime`, which is here already).

```ts
const read = await mailEvents.read(raw, envelope, us); // Mail | Noise | Broken
const after = mailEvents.keep(before, read.mail);
for (const told of mailEvents.told(before, after, us)) {
  const event = mailEvents.asWork(told, thread); // to the work that has told.conversation
}
const headers = mailEvents.answer(after, mailId, us); // Answer | No
```

- A new conversation goes to intake. One that work already has goes to that work.
- What we send is kept as a mail too, so its answers and its reports find it.

## Settled by the evals

- A mail never changes; it is named by its Message-ID. Conversations are the union of `In-Reply-To` and `References`, whatever order they came in. Never the subject: two mails called "Invoice" are two conversations.
- `person` and `invite` are the only ones that ask for something. Away is shown and is no answer. Reports, lists and machines never wake an agent as a person.
- `proven` needs a DKIM signature or DMARC of the domain of From, or one that it belongs to, said by **our own** server: the first `Authentication-Results` with its id, and only if it is above what the sender could have written. Relaxed alignment goes by the public suffix: `mail.acme.co.uk` and `acme.co.uk` belong together, `acme.co.uk` and `other.co.uk` do not. A small list of suffixes is enough.
- Failed and complained stay, whatever comes after. Only "no such address" and a complaint close an address; a full mailbox, a spam refusal and a mail too big do not.
- A report about a mail that is not ours is told to nobody.
- An answer goes to Reply-To over From, never to us, a list, or a closed address.
