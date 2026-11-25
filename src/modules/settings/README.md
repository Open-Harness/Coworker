# settings

What the Settings screens change in a workspace: its name, address, logo, time zone and default model; what each person
may do over their preset; their profile and notifications; usage and budgets; Keys, secrets and environments; agents
and skills; the audit log's export; and the export of everything.

It lives in the Workspace object, which builds a `SettingsPlace` (its storage, vault, model connections, sandboxes,
account and managers) and hands it to `createSettings`. The object has one RPC, `settings(call, by)`, and
`callSettings` gives the caller the typed answer back. The HTTP routes are in `http/internal/settings-*.ts`.

**Invariants**

- Every call is for one person (`By`) and leaves one audit line, a sentence naming them, in the workspace's action log
  under `settings.*`. The caller has already checked their role; nothing here trusts a request.
- No call returns a secret. Keys are only put into the vault; a connection comes back with its test result.
- An export contains names and dates of secrets, never values, and never the invite link's secret.
- A logo is at most 256 KB and a PNG, JPEG, GIF or WebP by its own first bytes, never SVG, whatever the sender said.
- A person's own changes are on or off per catalogue category or action. They are the `own` set the actions door reads,
  so a button and a manager's tool are checked alike. Presets stay Owner, Builder and Member.
- Budgets are in sandbox hours of the billing period, because that is what the workspace meters. At 80% and 100%
  the manager's owner gets an Inbox notice, once per period; a budget that says stop refuses the next command.
- Notification email is opt-in per kind (question, approval, notice). Each Inbox item is offered once, when made.

- An agent's settings, and what each may be, are the `agents` module's. Here each version is kept, and what only a workspace
  knows is checked: its skills, environments and models. Moving an agent from the Environments page is a save of it.

**Not here:** SSO, two-step sign-in, sign-in method switches, invoices and the card (Stripe), model spend (not metered),
passkeys, Slack DMs and phone notices, the daily digest. See the build report.

Test: `pnpm vitest --run src/modules/settings src/flows/settings-*.test.ts`
