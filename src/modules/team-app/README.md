# team-app

What a person does with managers in the hosted app, over the HTTP API.

**Owns**

- `BoardScreen`: the same tasks in four views — Kanban (a column per lane), List (a table per lane), Console (tasks by
  lane beside the picked one's details) and Inbox (what needs a person first). A board opens on its template's view.
- `InboxScreen` and `NeedsYou`: what waits for the person across managers as a table (Astryx `table-inbox`) with a reading
  pane beside it, and the page that decides one item. Both answer through the same `Decision` and `Options`; a phone has
  no pane, and a row opens the page.
- `ChatScreen`: a manager's chat. Lines become turns (`internal/chat-turns.ts`): what one side said or did in a row,
  with actions folded under the words around them. A line the server marks `streaming` is the answer being written: it
  is asked for every 600 ms, grows on the page, and is replaced by the manager's own entry when there is one. When the
  manager's page says the workspace has no model, a banner says what to do: an "Add a model" link to Keys for someone
  who can (an Owner), and who to ask for anyone else.
- `MissionScreen`: the mission and its pages, to read. The manager writes them.
- `TeamApp`: the API and who is signed in, for the screens under it. Signing in and joining are `team-join`'s.
- `createTeamApi`: the API over the line to the server. Answers are `unknown` until `internal/decode*.ts` narrows them; malformed rows
  are left out.

Each screen's `…Page` loads its data and asks again every few seconds while it is open.

**Invariants**

- Only Astryx draws (`pnpm check:ui`). No screen reads a browser global; the route file passes `fetch` in.
- Screens never import a server module; the wire shapes are this module's own `types.ts`.

**Testing**: `team-app.test.tsx` renders the screens with data in memory. The browser evals (`ui:manager/board`,
`ui:needs-you/page`) and the screenshots are in `e2e/`.
