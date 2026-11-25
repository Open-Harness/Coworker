# billing

What a workspace pays, as the Billing screen shows it: the Team plan's seats each month, and sandbox hours past
what the seats include. The arithmetic is here; charging goes to Stripe through `Billing` (a recorder in the fast
tier, `unbilled` until Stripe test mode is set up).

**Owns**

- The plan: $20 a seat each month, 10 sandbox hours a seat included, then $0.80 an hour.
- Seats: adding a member adds a seat at once; a removal is billed from the renewal, when the period rolls over.
- The period: monthly from the day the workspace was made, rolled forward whenever the account is read.
- The limit: "Stop sandboxes at $50 over plan", on by default. When the period's overage reaches it, `stopped` is
  true and the Workspace starts no sandbox.
- Overage reports: each command's seconds past the plan, once per command.

**Invariants**

- Seats billed this period never drop before the renewal.
- An hour is charged once, by the command that used it.

**Testing**: `billing.test.ts` drives `openAccount` in a Workspace object's storage with a fake clock.
`src/flows/sandbox.test.ts` and `src/flows/billing.test.ts` check the screen's numbers over HTTP.
