# board

A manager's board: lanes, fields, tasks, and the stage each open task waits in.

**Invariants**

- Lanes are the manager's and change freely. The stage is derived, first match wins (model.md "Stages"): an open
  question, then a `ready` report, then a `blocked`/`failed` report nobody wrote after, then no run started, then
  `waiting`, else working.

**Testing:** `board.test.ts`, on plain facts.
