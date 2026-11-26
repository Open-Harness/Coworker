/* Facts the sample story does not carry: what each manager may spend, and Root's own pages. */

/** What Root has handed each manager to spend in a week, in dollars. */
export const SPEND_LIMIT: Readonly<Record<string, number>> = {
  root: 30,
  coding: 200,
  docs: 25,
  releases: 20,
  support: 150,
  whatsapp: 60,
  sales: 100,
};

export const PAGE_TABS = ['Playbook', 'Notes', 'Trying now', 'Reach'] as const;
export type PageTab = (typeof PAGE_TABS)[number];

export const PAGES: Record<PageTab, string> = {
  Playbook: `## Playbook

Make, look after and improve the managers.

### What done looks like

Every objective is on its line. Right now that is 3 of 6, or 50%.

### How Juno goes about it

- Looks at each manager’s week and writes down what changed and why.
- Tries a new version on past work before it touches a live one.
- Asks a person when the choice is not its to make.
`,
  Notes: `## Notes

What Juno has been told, and who said so.

- **Ask what done means before starting.** Ama Mensah, 14 Nov. [Coding](#m-coding-overview) has done this since version 7.
- **Releases wait for the 150k fix.** Chidi Okafor, 24 Nov. [Releases](#m-releases-overview) asks to go without it, and still waits for an answer.
- **A person reads the first replies of any new Support version.** Bo Larsen, 6 Nov.
- **Scan the WhatsApp number again.** Juno, 25 Nov. It has been offline since 08:10, and the request is in your inbox.
`,
  'Trying now': `## Trying now

**Version 5 of Support**, on 40 past mails, beside version 4.

| | Mails |
| --- | --- |
| Done so far | 12 |
| Better than version 4 | 2 |
| The same | 10 |
| Still to do | 28 |

Nothing is sent to anyone: it only reads mail that has already been answered. Juno asks you before version 5 takes the place of version 4.

[Open Support](#m-support-overview)
`,
  Reach: `## Reach

### On its own

- Read every manager’s board, threads and numbers.
- Write notes and the weekly account of what changed.
- Try a new version on past work.

### Asks you first

- Put a new version in place of a live one.
- Make a manager, or stop one.
- Hand out a connector or an MCP server.
- Spend more than its week’s limit: $30.

### Never

- Write to a customer itself.
- Change what it is allowed to do.
`,
};
