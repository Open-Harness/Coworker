# team-home

Home (`/ws/<workspace>`) and a manager's Overview (`/ws/<workspace>/m/<manager>/overview`).

**Owns**

- `Home`: Astryx's `dashboard-alert-rail`. Tiles (open tasks, agents running, waiting on people, needs you), a line chart
  of tasks created and finished and a stacked bar chart of what became of what arrived, over a switchable 7 or 30 days.
  On the right a rail that scrolls on its own: "Needs you" (open Inbox items, newest first, each opening its item), then
  the managers with their state. Below 1024px the rail folds into the content.
- `Overview`: Astryx's `dashboard-progress` without its dated timeline (tasks have no due dates): the manager's name and
  mission line, a donut of tasks by lane, a burndown, tasks created and finished, "Blocked and waiting" (tasks that need a
  person, each opening the task) and a table with one row per agent and its progress.
- `createHomeApi`: the two read-only requests (`GET …/home`, `GET …/managers/<id>/overview`) and their decoders.

**Invariants**

- Every number was counted on the server (`dashboards`); nothing is counted here. Days arrive as thirty UTC days, oldest
  first, and a range only chooses how many of the last ones to draw.
- Real data only. A new workspace shows empty states and no chart with one point or a line of zeros.
- Charts come from `ui` (`LineChart`, `BarChart`, `DonutChart`) with colours named, never raw. Every chart has a name and
  the same numbers as a table for screen readers.
- Addresses come from `teamLinks`.

**Testing**: `team-home.test.tsx`, with the server in memory. `e2e/dashboards.spec.ts` drives both screens in a browser,
with real tasks and events.
