# dashboards

The numbers behind Home (`/ws/<workspace>`) and a manager's Overview, counted on the server.

**Owns**

- `dashboards.home` and `dashboards.overview`: facts in (each manager's board numbers, its decisions and heard lines, the
  person's Inbox), small numbers out: thirty UTC days, oldest first, for tasks created and finished, tasks still open,
  and heard lines by what became of them.
- `missionLine`: the first plain paragraph of a mission page.

**Invariants**

- Pure. It reads nothing and writes nothing; `http` gathers the facts and checks who may see them.
- The last lane of a board is "done" once the board has two lanes; a task is finished the day it entered it.
- No transcript text, key or person's words leave it. Task and Inbox titles are the only words, and only for people
  who may already read them.
- A day is a UTC day. The screens show the last seven or all thirty.

**Testing**: `dashboards.test.ts`, with facts written out by hand.
