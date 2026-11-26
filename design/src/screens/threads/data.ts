/* Facts the sample story does not carry: how many threads ended in the week, and Coding's limits on forks. */

/** Threads that ended in the last 7 days, all of them. The table shows the live ones and the latest that ended. */
export const ENDED_7_DAYS = 38;

/** What Coding's forks cost in 7 days. It is all of Coding's spend. */
export const FORKS_COST_7_DAYS = 148;

export const PAGE_TABS = ['What a fork is', 'Limits'] as const;
export type PageTab = (typeof PAGE_TABS)[number];

export const PAGES: Record<PageTab, string> = {
  'What a fork is': `## What a fork is

A fork starts with a copy of the conversation so far. From then on it is its own agent, with its own memory and limits. When it ends it reports back to what it was forked from, and nothing else goes back.
`,
  Limits: `## Limits

What Coding allows its forks.

| | Limit |
| --- | --- |
| Threads running at once | 6 |
| How deep a fork of a fork may go | 4 |
| Spend on one thread | $8 |
| Spend on one piece of work | $20 |

A thread that reaches a limit stops and says so to what it was forked from.
`,
};
