# search

Finds pages, tasks, managers and people by their words, across every manager of a workspace. Replaces the prototype's `history`
module as the plan grows it to tasks, pages, events and people.

**Owns** the ranking: every word of a query must start a word of the title or body, title words count three times,
and results from several managers merge by score.

**Invariants.** Pure: nothing here reads storage. Each Manager object searches its own pages and tasks; the Worker
merges the lists, so no table holds more than one tenant's text.

**Testing.** `search.test.ts` checks matching, ranking and merging on plain lists.
