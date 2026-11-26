# GitHub and mail, from real events: what was measured

25 November 2026. For [github-events](../../src/modules/github-events/README.md) and [mail-events](../../src/modules/mail-events/README.md).
The code that measured it was thrown away; what it found is in the types and the evals. The data is in `evals/rules/data/real`.

## The question

Is an event a step of a machine (`closed`: so it is closed now), or a record (this is the issue as it is)? What is there today takes steps. 35 real pull
requests of a public repo (286 events, from opened to merged or closed) were turned into GitHub's own deliveries, then delivered in order,
shuffled, and each up to twice.

| | Ends as GitHub says |
|---|---|
| Records, newest wins, in order | 35 of 35 |
| Records, shuffled and doubled, 40 ways each | **1,400 of 1,400** |
| Steps by verb, the same shuffles | 566 of 1,400 |

So a delivery is read for the whole records in it. What is true is worked out from the newest of each. What became true is the difference. Asking
GitHub gives the same records, so catching up after a missed delivery is the same path.

## What GitHub does that the types had to carry

| Found | So |
|---|---|
| Its times are whole seconds: 33 ties in 286 events | `rank` settles the ties it makes itself. A tie that is left says `tied`, the state says `sure: false`: ask |
| A dismissed review keeps the time it was given | `rank`: dismissed is later than given |
| A check is queued, started and done in one second; run again it has a new id | `rank` by state; the newer id wins |
| A check names a commit, not a pull request. From a fork its list of pull requests is empty | `withHead` |
| `mergeable` is `null` in most deliveries | `unknown`, never "clean" |
| A settled talk has no time of its own | It takes its item's |
| A real pull request was pushed back to an earlier commit | What was told is named by the commit and when, so it is told again |
| A merge is three deliveries: `pull_request closed`, a push, and the issue it closes | One `ended` each, once |

## Mail

Real bounces, delays, complaints and away notices, from the servers of 20 providers. 57 files.

| | |
|---|---|
| Told apart as failed, late, complained or away | 57 of 57 (one more file was left out: two messages in one) |
| Why it failed, from the status and the words | `no such address`, `full`, `refused`, `no answer` |
| A conversation of a month of a public list (47 mails), any order | The same, by references alone |

- Servers say the same with many words. The status code is missing in many, and wrong in some ("5.0.0"): the words are read as well.
- **A full mailbox answers 5.2.2**, "permanent". It is not. Only an address that does not exist, or a complaint, is for good.
- Away notices come with no sign at all from some servers but their subject.
- Archives put mails together by subject. Two customers may write "Invoice": ours goes by references only.
- The first mail of a conversation may never have come. Its id is known from the others, and stays its name when it does.

## How the evals were tried

A throwaway implementation passes all of them. Then it was broken on purpose in 33 places, one at a time: 28 were caught. The other five
change nothing that can be seen.

The fake GitHub that the flows run on was read with it too, from an issue to its merge: what is told is what happened, each once.

## Only the owner can

Real deliveries of our own App, to compare with GitHub's published ones: `pnpm credentials run node scripts/github-look.ts`. It only reads. A bounce of our
own address needs a deployed mailbox.
