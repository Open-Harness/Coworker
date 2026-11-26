# following

What GitHub says of a pull request or an issue, kept as it is, and what became true because of it told to the work that follows it.

`hear` keeps the records of a delivery (`github-events.keep`) and makes news of what became true (`github-events.told`): a check ended, a main that moved
under a pull request, a merge, a close. `run` tells that news to the work that follows the conversation, once (`work` keeps the key of every event), and
asks GitHub what a delivery cannot say: whether a pull request still merges after a push to the default branch, and everything a conversation holds after
the App was away (`back`). Both ways in end in the same records, so there is one path.

Given: a `FollowStore` (what it keeps), the managers that hear a repo (`Listener`), a way to read GitHub's REST for a repo, and a clock. Nothing is read from anywhere.

## Invariants

- What a person said (a comment, a review) is judged by intake, which knows who may ask: it is not told from here, unless it was learned by asking GitHub
  after a delivery was missed, which intake never heard.
- A conversation is the work's own issue when it is the first it follows. When the work has a pull request, the pull request's end is the work's end: the issue
  that is closed because it was merged is not a second end, so delivery in any order, any number of times, gives the same end.
- A merged pull request is told as `Merged #<n>` and nothing else; a close without a merge ends the work with that reason.
- News nobody follows is let go of after a minute; a pull request that cannot be asked about, the same. A delivery that comes before the work follows its pull
  request is therefore not lost.
- A record learned by asking is not stamped newer than what a delivery said, so a delivery that comes after it is not lost to it.

## How to test

`following.test.ts`, with a memory store and listeners that remember what they were told. The whole of it is shown by `evals/flows/repo-stays.eval.ts`.
