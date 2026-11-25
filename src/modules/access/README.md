# access

Which pages of the hosted app a person may open.

**Owns**

- `mayOpen(standing, page)`: the one answer the sidebar, the shell's gate and the server's data routes all ask.
- `mayDo(standing, actionId)`: whether one catalogue action is on for the person, for buttons such as New manager.
- The table of what each page needs (`internal/rules.ts`): everyone's, a read action (Mission needs `mission.read`, a
  manager's Settings `policy.read`, every manager page `board.read`), or a role. docs/actions.md and the presets decide it;
  nothing here is a second opinion.

**Invariants**

- A `Standing` is a preset and the person's own changes over it. Nothing else decides.
- A page is open only when the action behind it is `on`. `ask` cannot open a page: there is no one to ask on a read.
- Agents, Skills and Templates are read by everyone; changing them is refused by the server, not by this table.
- Environments are for Owners and Builders: they list the vault's secret names.

**Testing**: `access.test.ts`, through `mayOpen` and `mayDo`.
