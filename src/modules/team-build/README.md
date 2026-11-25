# team-build

What Owners and Builders shape, and the pages that go with a manager's work.

**Owns**

- A manager's Settings: Sources (with GitHub's repos and events, and Email's addresses and test mail), Who may ask
  (accept mode, the allowed list, what happens to everyone else, bots), Permissions (on, ask or off per category and
  per action) and Board (lanes, fields, the view it opens on).
- Events: what a manager heard, what the Gate made of it and what the manager decided (a candidate that became a Task
  opens it), filtered by what became of it, by source, and by a word.
- A source that lost its connection says so on Sources and on its own page, with what to do (GitHub: the App was
  uninstalled; an Owner installs it again). Email has no connection to lose, so it has no such state.
- Templates: the gallery, and starting a manager from one.
- Build: Agents and Skills, each with versions, and delete with a confirmation.
- The Task page (title, description, lane, owner, field values, comments, history) and the run page: its report, its transcript (the words being written now are the last line and grow, asked for every second), and "Stop run" while it goes, which presses `run.stop`. A stopped run says "Stopped by <name>" instead of an agent's report.
- `createBuildApi`: the routes these screens use, narrowed in `internal/decode-*.ts`.

**Invariants**

- A control is on a screen only when a route or a catalogue action saves what it changes. What the server cannot do
  yet (Slack and other chat sources, a manager's own domain, rules for proactive work) has no control.
- Changes to a manager's board, permissions and tasks go through `actions/<id>`, the same buttons the manager's tools
  are, so the server's checks, its `ask` and its audit line apply. A press that waits for an Owner says so.
- The server decides. A refusal shows the server's own words; a screen hides nothing for safety, but members see
  Owners-and-Builders screens read-only.
- Every form shows saving, saved and failed, and asks before a link or a closed tab throws away what was not saved.
- A deletion asks first and sends `{confirm}`.

**Testing**: `team-build.test.tsx` renders the pages against an in-memory server. `e2e/settings-manager.spec.ts` opens
and saves each one in the browser against the fake world, reloads, and checks the saved value is still there.
`e2e/events-list.spec.ts` and `e2e/sources-connect.spec.ts` send mail through the Worker's email handler
(`/api/test/inbound-mail`, fake world only) and signed GitHub webhooks, and follow what shows on Events and Sources.
