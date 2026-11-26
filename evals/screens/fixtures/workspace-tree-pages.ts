import type { TreeView } from "~/modules/views-workspace/types.ts";

/* Juno's own pages, under the tree. */
export const PAGES: TreeView["pages"] = [
  {
    id: "Playbook",
    text: `## Playbook

Make, look after and improve the managers.

### What done looks like

Every objective is on its line. Right now that is 3 of 6, or 50%.

### How Juno goes about it

- Looks at each manager’s week and writes down what changed and why.
- Tries a new version on past work before it touches a live one.
- Asks a person when the choice is not its to make.
`,
  },
  {
    id: "Notes",
    text: `## Notes

What Juno has been told, and who said so.

- **Ask what done means before starting.** Ama Mensah, 14 Nov. [Coding](/m/coding) has done this since version 7.
- **Releases wait for the 150k fix.** Chidi Okafor, 24 Nov. [Releases](/m/releases) asks to go without it, and still waits for an answer.
- **A person reads the first replies of any new Support version.** Bo Larsen, 6 Nov.
- **Scan the WhatsApp number again.** Juno, 25 Nov. It has been offline since 08:10, and the request is in your inbox.
`,
  },
  {
    id: "Trying now",
    text: `## Trying now

**Version 5 of Support**, on 40 past mails, beside version 4.

| | Mails |
| --- | --- |
| Done so far | 12 |
| Better than version 4 | 2 |
| The same | 10 |
| Still to do | 28 |

Nothing is sent to anyone: it only reads mail that has already been answered. Juno asks you before version 5 takes the place of version 4.

[Open Support](/m/support)
`,
  },
  {
    id: "Reach",
    text: `## Reach

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
  },
];
