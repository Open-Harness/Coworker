# github-connector

The hearing half of the GitHub connector: `receive(raw, secret, usFor)` checks a delivery's signature, reads it with `github-events`, and
answers what came in as one `Received` (an `Item`, an `Account` change, `Noise`, or `Refused`), with the installation it names.

Not here yet: `act` (comment, push, open a pull request, merge), `standing` (can this person write to the repo?) and catching up
by asking GitHub. They come with the work that acts, and use the same module.

## Invariants

- The signature is checked against the raw body before anything is read; what is not signed is `Refused` and nothing of it is kept.
- `usFor` is asked only after the signature held. The installation in a payload is believed only then.
- An `Item` is `by: "event"`, `account: "github"`, its `place` the repo, its `thread` `github:<repo>#<number>`, and its `same` is
  `github-events`' own: the same thing twice has the same key, whatever the delivery's id.

## How to test

With GitHub's own example payloads and `@octokit/webhooks-methods` to sign them (`test/github.ts`).
