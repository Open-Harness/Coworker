# team-shell

The frame around every screen of the hosted app.

**Owns**

- `TeamShell`: Astryx's AppShell with the sidebar. It loads the person's workspaces, the managers and how many Inbox
  items wait, and keeps all three fresh, so a renamed workspace shows its new name.
- `AppNav`: the workspace switcher, Home, Inbox, Search, New manager, each manager's Chat, Overview, Board and Mission, People,
  Environments, Settings (for an Owner), Profile and Notifications (for everyone, under their name) and signing out.
  `SettingsNav` takes its place while settings are open and offers each person only what their role opens: everyone's
  Profile and Notifications, and the workspace's eight pages for Owners.
- The gate: `pageOf` says which page an address opens, `mayOpen` (from the `access` module) says whether this person's role and own changes allow it, and a page they may not open is never mounted: `NoAccess` stands there, with a way back to the Inbox. The sidebar offers only what the same answer opens, and re-asks every few seconds so a change an Owner makes shows without a reload.
- Search (a command palette over tasks, mission pages, managers and people; Command-K or Control-K opens it) and the New manager dialog.
- `WorkspacesPage`: every workspace the person is in.
- `placeOf`: which item an address selects.

**Invariants**

- A workspace the person is not in shows the same page as one that does not exist.
- Addresses come from `teamLinks`; nothing here spells one.
- A page is closed here and refused by the server by the same `mayOpen`: hiding it is never the only thing between a person and its data.

**Testing**: `team-shell.test.tsx`, with the server in memory. `e2e/screens.spec.ts` drives it in a browser.
