# team-settings

A workspace's settings, its people and its environments.

**Owns**

- Everyone's own screens: Profile (name, linked accounts, time zone, working hours, where they are signed in) and Notifications (which kinds of notice are also
  mailed, quiet hours).
- An Owner's workspace screens: General (name, address, logo, time zone, default model, export, deleting the workspace),
  Members (preset per person, invites, links and domains), Roles and permissions (what each preset may do, and each
  person's own on, ask or off), Keys and connections (test again, replace a key, edit an endpoint, remove, secret names),
  Usage (sandbox hours, runs, a budget per manager), Billing (the sandbox limit), Security (invite link, approved
  domains) and the Audit log (an Astryx PowerSearch of who, outcome, where, category, permission and when, each sent to the server; pages; CSV of the same filter). `SettingsPages` picks one by its name in the address.
- `EnvironmentsPage` (test start, delete, agents, secrets) and `PeoplePage`, which sit in the app's own sidebar.
- `createSettingsApi`: the routes these screens use, ours and Better Auth's, narrowed in `internal/decode-*.ts`.

**Invariants**

- A control is on a screen only when a route saves what it changes. What has no route (custom presets, two-step
  sign-in, cards and invoices, session length…) has no control.
- Screens take data and callbacks; only the `*Page.tsx` files beside `internal/Pages.tsx` load anything.
- Every screen shows loading, empty, and a failed load with "Try again". A form shows `Not saved yet`, `Saving…`, `Saved`
  or the server's own words for a refusal (`SaveBar`). Something that cannot be undone asks first (`ConfirmDialog`); the
  workspace is only deleted once its name is typed.
- A form holds its changes in `useDraft` and tells the page through `useUnsaved`; the route stops a link, the back button
  or closing the tab and asks (`LeaveDialog`). Nothing unsaved is thrown away silently.
- A refused change shows the server's own words. The server decides; a screen hides nothing for safety, except that the
  nav offers an Owner's pages to Owners only, and a Builder or Member who opens one by address is told so.
- A key or a secret goes one way: no screen can show one. An endpoint whose address changes needs its key typed again.
- On a phone a table that holds buttons becomes one card for each row, so no control is cut off.

**Testing**: `team-settings.test.tsx` and `screens.test.tsx` render screens with data in memory and check the decoders
through `createSettingsApi`. `e2e/settings-workspace*.spec.ts` change, save, reload and look at every screen in the fake
world, on a desktop and a phone; `e2e/screens.spec.ts` opens each one.
